const prisma = require('../config/prisma');

const validateAssignmentHierarchy = async (assignerRole, assigneeId) => {
    if (!assigneeId) return null;
    const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { role: true, fullName: true }
    });
    if (!assignee) return null;

    if (['FOREMAN', 'SUBCONTRACTOR'].includes(assignerRole) && assignee.role !== 'WORKER') {
        return `${assignerRole} can only assign tasks to Workers. (Tried to assign to: ${assignee.fullName} who is ${assignee.role})`;
    }
    return null;
};

const createSubTasksRecursive = async (taskId, onModel, steps, companyId, createdBy, parentId = null, assignedTo = null, startDate = null, dueDate = null) => {
    if (!steps || !Array.isArray(steps) || steps.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const subTask = await prisma.subTask.create({
            data: {
                companyId,
                parentId: taskId,
                parentType: onModel === 'JobTask' ? 'JobTask' : 'Task',
                title: step.title,
                description: step.remarks || step.description || '',
                priority: step.priority || 'Medium',
                createdBy,
                assignedTo: step.assignedTo || assignedTo || null,
                startDate: step.startDate ? new Date(step.startDate) : (startDate ? new Date(startDate) : null),
                dueDate: step.dueDate ? new Date(step.dueDate) : (dueDate ? new Date(dueDate) : null),
                status: 'todo',
                estimatedHours: step.estimatedHours ? Number(step.estimatedHours) : 0.0
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

const updateJobProgress = async (jobId) => {
    try {
        const totalTasks = await prisma.jobTask.count({
            where: { jobId, NOT: { status: 'cancelled' } }
        });
        if (totalTasks === 0) {
            await prisma.job.update({
                where: { id: jobId },
                data: { progress: 0 }
            });
            return;
        }

        const completedTasks = await prisma.jobTask.count({
            where: { jobId, status: 'completed' }
        });
        const progress = Math.round((completedTasks / totalTasks) * 100);

        await prisma.job.update({
            where: { id: jobId },
            data: { progress }
        });
    } catch (err) {
        console.error('Error updating job progress:', err);
    }
};

const createJobTask = async (req, res) => {
    try {
        const { jobId, title, description, assignedTo, assignedRoleType, priority, dueDate, startDate, subTasksList } = req.body;

        const hierarchyError = await validateAssignmentHierarchy(req.user.role, assignedTo);
        if (hierarchyError) {
            return res.status(403).json({ message: hierarchyError });
        }

        let assignedForeman = null;
        if (assignedTo) {
            const assigneeInfo = await prisma.user.findUnique({
                where: { id: assignedTo },
                select: { role: true }
            });
            if (assigneeInfo && assigneeInfo.role === 'FOREMAN') {
                assignedForeman = assignedTo;
            } else if (req.user.role === 'FOREMAN') {
                assignedForeman = req.user.id;
            }
        }

        const normalizedPriority = (priority || 'medium').toLowerCase();

        const task = await prisma.jobTask.create({
            data: {
                jobId,
                companyId: req.user.companyId,
                title,
                description: description || '',
                assignedWorker: assignedTo || null,
                assignedRoleType: assignedRoleType || '',
                assignedForeman,
                priority: normalizedPriority,
                status: 'pending',
                dueDate: dueDate ? new Date(dueDate) : null,
                startDate: startDate ? new Date(startDate) : null,
                createdBy: req.user.id
            }
        });

        if (subTasksList && Array.isArray(subTasksList) && subTasksList.length > 0) {
            await createSubTasksRecursive(task.id, 'JobTask', subTasksList, req.user.companyId, req.user.id, null, assignedTo, startDate, dueDate);
        }

        await updateJobProgress(jobId);

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { project: { select: { name: true } } }
        });

        if (assignedTo) {
            await prisma.notification.create({
                data: {
                    companyId: req.user.companyId,
                    userId: assignedTo,
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${title}" for job ${job?.name || 'Unknown'}.`,
                    type: 'task'
                }
            });

            const io = req.app.get('io');
            if (io) {
                io.to(assignedTo).emit('notification', {
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${title}".`
                });
            }
        }

        const populatedTask = await prisma.jobTask.findUnique({
            where: { id: task.id },
            include: { worker: { select: { fullName: true, role: true } } }
        });

        res.status(201).json({
            ...populatedTask,
            _id: populatedTask.id,
            assignedTo: populatedTask.worker
        });
    } catch (err) {
        console.error('Error in createJobTask:', err);
        res.status(500).json({ message: err.message });
    }
};

const getJobTasks = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const whereClause = { jobId: req.params.jobId, companyId };

        if (req.user.role === 'WORKER') {
            const subTaskJobTaskIds = await prisma.subTask.findMany({
                where: { assignedTo: req.user.id, companyId, parentType: 'JobTask' },
                select: { parentId: true }
            });
            const taskIds = subTaskJobTaskIds.map(st => st.parentId);
            whereClause.OR = [
                { assignedWorker: req.user.id },
                { id: { in: taskIds } }
            ];
        }

        const tasks = await prisma.jobTask.findMany({
            where: whereClause,
            include: { worker: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const taskIds = tasks.map(t => t.id);
        const subTasks = await prisma.subTask.findMany({
            where: { parentId: { in: taskIds }, companyId },
            include: {
                assignee: { select: { fullName: true, role: true } },
                creator: { select: { fullName: true } }
            }
        });

        const mappedSubTasks = subTasks.map(st => ({
            ...st,
            _id: st.id,
            isSubTask: true,
            isJobTask: true,
            assignedTo: st.assignee,
            createdBy: st.creator
        }));

        const mappedTasks = tasks.map(t => ({
            ...t,
            _id: t.id,
            assignedTo: t.worker
        }));

        const allTasks = [...mappedTasks, ...mappedSubTasks].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(allTasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateJobTask = async (req, res) => {
    try {
        const task = await prisma.jobTask.findUnique({
            where: { id: req.params.id }
        });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const updateData = {};

        if (req.user.role === 'WORKER') {
            if (task.assignedWorker !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this task' });
            }
            const { status, cancellationReason } = req.body;
            if (status) updateData.status = status;
            if (cancellationReason) updateData.cancellationReason = cancellationReason;
        } else {
            const updates = { ...req.body };
            if (updates.assignedTo) {
                const hierarchyError = await validateAssignmentHierarchy(req.user.role, updates.assignedTo);
                if (hierarchyError) {
                    return res.status(403).json({ message: hierarchyError });
                }
                updateData.assignedWorker = updates.assignedTo;
            }

            if (updates.status === 'todo') updates.status = 'pending';
            if (updates.priority) updates.priority = updates.priority.toLowerCase();
            if (updates.assignedTo === "") updateData.assignedWorker = null;
            
            Object.assign(updateData, updates);
            delete updateData.assignedTo;
            delete updateData.id;
            delete updateData._id;

            if (updates.assignedTo && req.user.role === 'FOREMAN' && !task.assignedForeman) {
                updateData.assignedForeman = req.user.id;
            }
        }

        if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);

        const updated = await prisma.jobTask.update({
            where: { id: req.params.id },
            data: updateData,
            include: { worker: { select: { fullName: true, role: true } } }
        });

        if (req.body.status) {
            await updateJobProgress(updated.jobId);

            if (updated.createdBy !== req.user.id) {
                const job = await prisma.job.findUnique({ where: { id: updated.jobId } });
                await prisma.notification.create({
                    data: {
                        companyId: req.user.companyId,
                        userId: updated.createdBy,
                        title: 'Task Status Updated',
                        message: `Task "${updated.title}" status changed to ${updated.status} by ${req.user.fullName}.`,
                        type: 'task'
                    }
                });

                const io = req.app.get('io');
                if (io) {
                    io.to(updated.createdBy).emit('notification', {
                        title: 'Task Status Updated',
                        message: `Task "${updated.title}" status changed to ${updated.status}.`
                    });
                }
            }
        }

        res.json({
            ...updated,
            _id: updated.id,
            assignedTo: updated.worker
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteJobTask = async (req, res) => {
    try {
        const task = await prisma.jobTask.findUnique({
            where: { id: req.params.id }
        });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (req.user.role === 'WORKER') {
            if (task.assignedWorker !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this task' });
            }
            if (task.status !== 'cancelled') {
                return res.status(400).json({ message: 'Can only delete cancelled tasks' });
            }
        }

        const jobId = task.jobId;
        await prisma.jobTask.delete({
            where: { id: req.params.id }
        });

        await updateJobProgress(jobId);

        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getWorkerTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const companyId = req.user.companyId;

        const subTaskJobTaskIds = await prisma.subTask.findMany({
            where: { assignedTo: userId, companyId, parentType: 'JobTask' },
            select: { parentId: true }
        });
        const taskIds = subTaskJobTaskIds.map(st => st.parentId);

        const whereClause = {
            companyId,
            OR: [
                { assignedWorker: userId },
                { id: { in: taskIds } }
            ]
        };

        if (req.user.role === 'FOREMAN') {
            whereClause.OR.push({ assignedForeman: userId });
        }

        if (req.query.excludeCompleted === 'true') {
            whereClause.NOT = { status: { in: ['completed', 'cancelled'] } };
        }

        const tasks = await prisma.jobTask.findMany({
            where: whereClause,
            include: {
                job: {
                    select: {
                        name: true,
                        projectId: true,
                        project: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = tasks.map(t => ({
            ...t,
            _id: t.id,
            jobId: t.job ? {
                ...t.job,
                _id: t.jobId,
                projectId: t.job.project
            } : null
        }));

        res.json(mapped);
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
