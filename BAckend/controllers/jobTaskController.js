const prisma = require('../config/prisma');

// Helper: Validate role-based assignment hierarchy
const validateAssignmentHierarchy = async (assignerRole, assigneeId) => {
    if (!assigneeId) return null;
    const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        include: { role: true }
    });
    if (!assignee) return null;
    const roleName = assignee.role ? assignee.role.name : 'WORKER';

    if (['FOREMAN', 'SUBCONTRACTOR'].includes(assignerRole) && roleName !== 'WORKER') {
        return `${assignerRole} can only assign tasks to Workers. (Tried to assign to: ${assignee.fullName} who is ${roleName})`;
    }
    return null;
};

// Helper: Recursively create subtasks from a tree
const createSubTasksRecursive = async (taskId, onModel, steps, companyId, createdBy, parentId = null, assignedTo = null, startDate = null, dueDate = null) => {
    if (!steps || !Array.isArray(steps) || steps.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const subTask = await prisma.subTask.create({
            data: {
                taskId,
                companyId,
                title: step.title,
                remarks: step.remarks || '',
                priority: step.priority ? String(step.priority).toUpperCase() : 'MEDIUM',
                createdBy,
                position: i,
                parentSubTaskId: parentId,
                assignedTo: step.assignedTo || assignedTo || null,
                startDate: step.startDate ? new Date(step.startDate) : (startDate ? new Date(startDate) : null),
                dueDate: step.dueDate ? new Date(step.dueDate) : (dueDate ? new Date(dueDate) : null),
                status: 'todo'
            }
        });
        count++;
        if (step.steps && step.steps.length > 0) {
            const childCount = await createSubTasksRecursive(taskId, onModel, step.steps, companyId, createdBy, subTask.id, assignedTo, startDate, dueDate);
            count += childCount;
        }
    }
    return count;
};

// Helper to update job progress
const updateJobProgress = async (jobId) => {
    if (!jobId) return;
    try {
        const totalTasks = await prisma.task.count({
            where: { jobId, status: { not: 'CANCELLED' }, deletedAt: null }
        });
        if (totalTasks === 0) {
            await prisma.job.update({ where: { id: jobId }, data: { progress: 0 } }).catch(() => {});
            return;
        }

        const completedTasks = await prisma.task.count({
            where: { jobId, status: 'COMPLETED', deletedAt: null }
        });
        const progress = Math.round((completedTasks / totalTasks) * 100);

        await prisma.job.update({ where: { id: jobId }, data: { progress } }).catch(() => {});
    } catch (err) {
        console.error('Error updating job progress:', err);
    }
};

const createJobTask = async (req, res) => {
    try {
        const { jobId, title, description, assignedTo, assignedRoleType, priority, dueDate, startDate, subTasksList } = req.body;
        const userId = req.user.id || req.user._id;

        const hierarchyError = await validateAssignmentHierarchy(req.user.role, assignedTo);
        if (hierarchyError) {
            return res.status(403).json({ message: hierarchyError });
        }

        let assignedForeman = null;
        if (assignedTo) {
            const assigneeInfo = await prisma.user.findUnique({
                where: { id: assignedTo },
                include: { role: true }
            });
            const roleName = assigneeInfo?.role?.name || 'WORKER';
            if (roleName === 'FOREMAN') {
                assignedForeman = assignedTo;
            } else if (req.user.role === 'FOREMAN') {
                assignedForeman = userId;
            }
        }

        const normalizedPriority = (priority || 'MEDIUM').toUpperCase();

        const task = await prisma.task.create({
            data: {
                jobId: jobId || null,
                companyId: req.user.companyId,
                title,
                description: description || null,
                assignedTo: assignedTo || null,
                assignedRoleType: assignedRoleType || null,
                assignedForeman: assignedForeman || null,
                priority: normalizedPriority,
                status: 'PENDING',
                dueDate: dueDate ? new Date(dueDate) : null,
                startDate: startDate ? new Date(startDate) : null,
                createdBy: userId
            },
            include: {
                assignedUser: { select: { id: true, fullName: true, role: true } }
            }
        });

        if (subTasksList && Array.isArray(subTasksList) && subTasksList.length > 0) {
            await createSubTasksRecursive(task.id, 'JobTask', subTasksList, req.user.companyId, userId, null, assignedTo, startDate, dueDate);
        }

        if (jobId) {
            await updateJobProgress(jobId);
        }

        const job = jobId ? await prisma.job.findUnique({
            where: { id: jobId },
            include: { project: { select: { id: true, name: true } } }
        }) : null;

        if (assignedTo) {
            await prisma.notification.create({
                data: {
                    recipientId: assignedTo,
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${title}" for job ${job?.name || 'Unknown'}.`,
                    type: 'TASK',
                    link: `/company-admin/projects/${job?.project?.id || 'all'}/jobs/${jobId || ''}`
                }
            }).catch(() => {});

            const io = req.app.get('io');
            if (io) {
                io.to(assignedTo.toString()).emit('notification', {
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${title}".`
                });
            }
        }

        const formatted = {
            ...task,
            _id: task.id,
            assignedTo: task.assignedUser ? { ...task.assignedUser, _id: task.assignedUser.id } : null
        };
        res.status(201).json(formatted);
    } catch (err) {
        console.error('Error in createJobTask:', err);
        res.status(500).json({ message: err.message });
    }
};

const getJobTasks = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id || req.user._id;

        const where = { jobId: req.params.jobId, companyId, deletedAt: null };

        if (req.user.role === 'WORKER') {
            const subTaskJobTaskIds = (await prisma.subTask.findMany({
                where: { assignedTo: userId, companyId },
                select: { taskId: true }
            })).map(s => s.taskId).filter(Boolean);

            where.OR = [
                { assignedTo: userId },
                { id: { in: subTaskJobTaskIds } }
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                assignedUser: { select: { id: true, fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedTasks = tasks.map(t => ({
            ...t,
            _id: t.id,
            assignedTo: t.assignedUser ? { ...t.assignedUser, _id: t.assignedUser.id } : null
        }));

        res.json(formattedTasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateJobTask = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const updateData = {};

        if (req.user.role === 'WORKER') {
            if (task.assignedTo !== userId) {
                return res.status(403).json({ message: 'Not authorized to update this task' });
            }
            const { status, cancellationReason } = req.body;
            if (status) updateData.status = String(status).toUpperCase();
            if (cancellationReason) updateData.cancellationReason = cancellationReason;
        } else {
            const updates = { ...req.body };
            if (updates.assignedTo) {
                const hierarchyError = await validateAssignmentHierarchy(req.user.role, updates.assignedTo);
                if (hierarchyError) {
                    return res.status(403).json({ message: hierarchyError });
                }
            }

            if (updates.status) {
                let s = String(updates.status).toUpperCase();
                if (s === 'TODO') s = 'PENDING';
                updateData.status = s;
            }
            if (updates.priority) updateData.priority = String(updates.priority).toUpperCase();
            if (updates.title) updateData.title = updates.title;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo || null;
            if (updates.startDate) updateData.startDate = new Date(updates.startDate);
            if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
        }

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                assignedUser: { select: { id: true, fullName: true, role: true } }
            }
        });

        if (updateData.status && task.jobId) {
            await updateJobProgress(task.jobId);
        }

        const formatted = {
            ...updatedTask,
            _id: updatedTask.id,
            assignedTo: updatedTask.assignedUser ? { ...updatedTask.assignedUser, _id: updatedTask.assignedUser.id } : null
        };

        res.json(formatted);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteJobTask = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (req.user.role === 'WORKER') {
            if (task.assignedTo !== userId) {
                return res.status(403).json({ message: 'Not authorized to delete this task' });
            }
            if (task.status !== 'CANCELLED' && task.status !== 'cancelled') {
                return res.status(400).json({ message: 'Can only delete cancelled tasks' });
            }
        }

        const jobId = task.jobId;
        await prisma.task.delete({ where: { id: req.params.id } });

        if (jobId) {
            await updateJobProgress(jobId);
        }

        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getWorkerTasks = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const companyId = req.user.companyId;

        const subTaskJobTaskIds = (await prisma.subTask.findMany({
            where: { assignedTo: userId, companyId },
            select: { taskId: true }
        })).map(s => s.taskId).filter(Boolean);

        const OR = [
            { assignedTo: userId },
            { id: { in: subTaskJobTaskIds } }
        ];

        if (req.user.role === 'FOREMAN') {
            OR.push({ assignedForeman: userId });
        }

        const where = {
            companyId,
            deletedAt: null,
            OR
        };

        if (req.query.excludeCompleted === 'true') {
            where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                job: {
                    select: {
                        id: true,
                        name: true,
                        project: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = tasks.map(t => ({
            ...t,
            _id: t.id,
            jobId: t.job ? { ...t.job, _id: t.job.id, projectId: t.job.project ? { ...t.job.project, _id: t.job.project.id } : null } : t.jobId
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createJobTask,
    getJobTasks,
    updateJobTask,
    deleteJobTask,
    getWorkerTasks
};
