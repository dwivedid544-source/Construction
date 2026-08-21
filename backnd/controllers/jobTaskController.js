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

const createSubTasksRecursive = async (taskId, onModel, steps, companyId, createdBy, parentSubTaskId = null, assignedTo = null, startDate = null, dueDate = null) => {
    if (!steps || !Array.isArray(steps) || steps.length === 0) return 0;
    let count = 0;
    const cleanAssignedTo = typeof assignedTo === 'object' && assignedTo !== null ? (assignedTo._id || assignedTo.id) : (assignedTo || null);

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepAssignee = step.assignedTo ? (typeof step.assignedTo === 'object' ? (step.assignedTo._id || step.assignedTo.id) : step.assignedTo) : cleanAssignedTo;

        const subTask = await prisma.subTask.create({
            data: {
                taskId: taskId,
                onModel: onModel === 'JobTask' ? 'JobTask' : 'Task',
                parentSubTaskId: parentSubTaskId || null,
                companyId,
                title: (step.title || 'Untitled Subtask').trim(),
                remarks: step.remarks || step.description || '',
                priority: step.priority ? (step.priority.charAt(0).toUpperCase() + step.priority.slice(1).toLowerCase()) : 'Medium',
                createdBy,
                assignedTo: stepAssignee || null,
                startDate: step.startDate ? new Date(step.startDate) : (startDate ? new Date(startDate) : null),
                dueDate: step.dueDate ? new Date(step.dueDate) : (dueDate ? new Date(dueDate) : null),
                status: 'todo'
            }
        });
        count++;
        if (step.steps && step.steps.length > 0) {
            const childCount = await createSubTasksRecursive(taskId, onModel, step.steps, companyId, createdBy, subTask.id, stepAssignee, startDate, dueDate);
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

        const assigneeId = typeof assignedTo === 'object' && assignedTo !== null ? (assignedTo._id || assignedTo.id) : (assignedTo || null);

        const task = await prisma.jobTask.create({
            data: {
                jobId,
                companyId: req.user.companyId,
                title: title.trim(),
                description: description || '',
                assignedTo: assigneeId,
                assignedWorker: assigneeId,
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

        // Safely send notification (don't crash if it fails)
        try {
            const job = await prisma.job.findUnique({ where: { id: jobId } });
            if (assigneeId) {
                await prisma.notification.create({
                    data: {
                        companyId: req.user.companyId,
                        userId: assigneeId,
                        title: 'New Task Assigned',
                        message: `You have been assigned a new task: "${title}" for job ${job?.name || 'Unknown'}.`,
                        type: 'task'
                    }
                });
                const io = req.app.get('io');
                if (io) {
                    io.to(String(assigneeId)).emit('notification', {
                        title: 'New Task Assigned',
                        message: `You have been assigned a new task: "${title}".`
                    });
                }
            }
        } catch (notifErr) {
            console.warn('[createJobTask] Notification error (non-fatal):', notifErr.message);
        }

        res.status(201).json({
            ...task,
            _id: task.id,
            assignedTo: assigneeId,
            isJobTask: true
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
                where: { assignedTo: req.user.id, companyId, onModel: 'JobTask' },
                select: { taskId: true }
            });
            const taskIds = subTaskJobTaskIds.map(st => st.taskId).filter(Boolean);
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

        const taskIds = tasks.map(t => t.id || t._id);
        const subTasks = await prisma.subTask.findMany({
            where: { taskId: { in: taskIds }, onModel: 'JobTask', companyId },
            include: {
                assignee: { select: { fullName: true, role: true } },
                creator: { select: { fullName: true } }
            }
        });

        const mappedSubTasks = subTasks.map(st => ({
            ...st,
            _id: st.id,
            taskId: st.taskId?.toString ? st.taskId.toString() : String(st.taskId),
            parentSubTaskId: st.parentSubTaskId?.toString ? st.parentSubTaskId.toString() : (st.parentSubTaskId ? String(st.parentSubTaskId) : null),
            isSubTask: true,
            isJobTask: true,
            assignedTo: st.assignee || st.assignedTo,
            createdBy: st.creator || st.createdBy
        }));

        const mappedTasks = tasks.map(t => ({
            ...t,
            _id: t.id,
            assignedTo: t.worker || t.assignedWorker
        }));

        const allTasks = [...mappedTasks, ...mappedSubTasks].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(allTasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateJobTask = async (req, res) => {
    try {
        let task = await prisma.jobTask.findUnique({
            where: { id: req.params.id }
        });

        // If not found in JobTask, check if it's a SubTask!
        if (!task) {
            const subTask = await prisma.subTask.findUnique({
                where: { id: req.params.id }
            });
            if (subTask) {
                const updateData = {};
                if (req.body.status) updateData.status = req.body.status;
                if (req.body.assignedTo !== undefined) updateData.assignedTo = req.body.assignedTo || null;
                if (req.body.priority) {
                    const p = req.body.priority;
                    updateData.priority = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                }
                if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
                if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
                if (req.body.title) updateData.title = req.body.title;
                if (req.body.remarks !== undefined || req.body.description !== undefined) {
                    updateData.remarks = req.body.remarks || req.body.description || '';
                }

                const updatedSub = await prisma.subTask.update({
                    where: { id: req.params.id },
                    data: updateData,
                    include: { assignee: { select: { fullName: true, role: true } } }
                });

                if (subTask.taskId) {
                    const parentJobTask = await prisma.jobTask.findUnique({ where: { id: subTask.taskId } });
                    if (parentJobTask?.jobId) {
                        await updateJobProgress(parentJobTask.jobId);
                    }
                }

                return res.json({
                    ...updatedSub,
                    _id: updatedSub.id,
                    isSubTask: true,
                    isJobTask: true,
                    assignedTo: updatedSub.assignee || updatedSub.assignedTo
                });
            }

            return res.status(404).json({ message: 'Task not found' });
        }

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
        let task = await prisma.jobTask.findUnique({
            where: { id: req.params.id }
        });
        
        if (!task) {
            const subTask = await prisma.subTask.findUnique({
                where: { id: req.params.id }
            });
            if (subTask) {
                await prisma.subTask.delete({
                    where: { id: req.params.id }
                });
                if (subTask.taskId) {
                    const parentJobTask = await prisma.jobTask.findUnique({ where: { id: subTask.taskId } });
                    if (parentJobTask?.jobId) {
                        await updateJobProgress(parentJobTask.jobId);
                    }
                }
                return res.json({ message: 'Subtask deleted' });
            }
            return res.status(404).json({ message: 'Task not found' });
        }

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
        // Also delete child subtasks
        await prisma.subTask.deleteMany({
            where: { taskId: req.params.id }
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
            where: { assignedTo: userId, companyId, onModel: 'JobTask' },
            select: { taskId: true }
        });
        const taskIds = subTaskJobTaskIds.map(st => st.taskId).filter(Boolean);

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
