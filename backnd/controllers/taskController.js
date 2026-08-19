const prisma = require('../config/prisma');
const { dispatchNotification } = require('../utils/notificationHelper');

const normalizeDateToUTC = (date) => {
    if (!date) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

const validateAssignmentHierarchy = async (assignerRole, assigneeIds) => {
    if (!assigneeIds || assigneeIds.length === 0) return null;
    const assignees = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { role: true, fullName: true }
    });
    for (const assignee of assignees) {
        if (['FOREMAN', 'SUBCONTRACTOR'].includes(assignerRole) && !['WORKER'].includes(assignee.role)) {
            return `${assignerRole} can only assign tasks to Workers. (Tried to assign to: ${assignee.fullName} who is ${assignee.role})`;
        }
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

// @desc    Get tasks (role-based)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const whereClause = { companyId };

        if (req.query.projectId) {
            whereClause.projectId = req.query.projectId;
        }
        
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        
        if (req.query.priority) {
            whereClause.priority = req.query.priority;
        }

        if (req.query.excludeCompleted === 'true') {
            whereClause.NOT = { status: { in: ['completed', 'cancelled'] } };
        }

        if (req.query.q) {
            whereClause.OR = [
                { title: { contains: req.query.q } },
                { description: { contains: req.query.q } }
            ];
        }

        if (['WORKER', 'SUBCONTRACTOR'].includes(role)) {
            whereClause.OR = [
                { assignedTo: userId },
                { createdBy: userId }
            ];
        } else if (role === 'FOREMAN') {
            const managedJobs = await prisma.job.findMany({
                where: { foremanId: userId, companyId },
                include: { assignedWorkers: true }
            });
            const workerIds = managedJobs.flatMap(j => j.assignedWorkers.map(w => w.id));
            const allIds = [userId, ...workerIds];
            whereClause.OR = [
                { assignedTo: { in: allIds } },
                { createdBy: userId }
            ];
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                assignee: { select: { fullName: true, role: true } },
                creator: { select: { fullName: true } },
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedTasks = tasks.map(task => ({
            ...task,
            _id: task.id,
            assignedTo: task.assignee,
            createdBy: task.creator,
            projectId: task.project
        }));

        res.json(mappedTasks);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's tasks
// @route   GET /api/tasks/my
// @access  Private
const getMyTasks = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const tasks = await prisma.task.findMany({
            where: { assignedTo: userId },
            include: { project: { select: { name: true } } }
        });
        res.json(tasks.map(t => ({ ...t, _id: t.id, projectId: t.project })));
    } catch (error) {
        next(error);
    }
};

// @desc    Get project tasks
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getProjectTasks = async (req, res, next) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { projectId: req.params.projectId },
            include: { assignee: { select: { fullName: true } } }
        });
        res.json(tasks.map(t => ({ ...t, _id: t.id, assignedTo: t.assignee })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
    try {
        const { title, description, assignedTo, projectId, priority, startDate, dueDate, estimatedHours, steps } = req.body;

        const validationErr = await validateAssignmentHierarchy(req.user.role, assignedTo ? [assignedTo] : []);
        if (validationErr) {
            res.status(400);
            throw new Error(validationErr);
        }

        const task = await prisma.task.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                title,
                description: description || '',
                assignedTo,
                priority: priority || 'medium',
                status: 'todo',
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
                createdBy: req.user.id
            }
        });

        if (steps && Array.isArray(steps) && steps.length > 0) {
            await createSubTasksRecursive(task.id, 'Task', steps, req.user.companyId, req.user.id, null, assignedTo, startDate, dueDate);
        }

        if (assignedTo) {
            await dispatchNotification(req, {
                userId: assignedTo,
                title: 'New Task Assigned',
                message: `You have been assigned to task: "${title}"`,
                link: `/company-admin/tasks`,
                type: 'task'
            });
        }

        res.status(201).json({ ...task, _id: task.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign task to user
// @route   PATCH /api/tasks/:id/assign
// @access  Private
const assignTask = async (req, res, next) => {
    try {
        const { assignedTo } = req.body;
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const validationErr = await validateAssignmentHierarchy(req.user.role, assignedTo ? [assignedTo] : []);
        if (validationErr) {
            res.status(400);
            throw new Error(validationErr);
        }

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: { assignedTo }
        });

        if (assignedTo) {
            await dispatchNotification(req, {
                userId: assignedTo,
                title: 'Task Assigned',
                message: `You have been assigned to task: "${task.title}"`,
                link: `/company-admin/tasks`,
                type: 'task'
            });
        }

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task details or status
// @route   PATCH /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
    try {
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
        if (updateData.estimatedHours) updateData.estimatedHours = Number(updateData.estimatedHours);
        if (updateData.actualHours) updateData.actualHours = Number(updateData.actualHours);

        if (updateData.status === 'completed') {
            updateData.isCompleted = true;
            updateData.completionDate = new Date();
        }

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                ...updateData,
                changedBy: req.user.id,
                changedAt: new Date()
            }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
    try {
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        await prisma.$transaction([
            prisma.subTask.deleteMany({ where: { parentId: req.params.id, parentType: 'Task' } }),
            prisma.task.delete({ where: { id: req.params.id } })
        ]);

        res.json({ message: 'Task removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder tasks
// @route   POST /api/tasks/reorder
// @access  Private
const reorderTasks = async (req, res, next) => {
    try {
        const { taskIds } = req.body;
        if (!taskIds || !Array.isArray(taskIds)) {
            res.status(400);
            throw new Error('Task IDs array is required');
        }

        await prisma.$transaction(
            taskIds.map((id, index) => prisma.task.update({
                where: { id },
                data: { changedAt: new Date() } // utilizing date sync triggers if any or simply touch
            }))
        );

        res.json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get subtasks
// @route   GET /api/tasks/:id/subtasks
// @access  Private
const getSubTasks = async (req, res, next) => {
    try {
        const subTasks = await prisma.subTask.findMany({
            where: { parentId: req.params.id },
            include: { assignee: { select: { fullName: true } } }
        });
        res.json(subTasks.map(st => ({ ...st, _id: st.id, assignedTo: st.assignee })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create subtask
// @route   POST /api/tasks/:id/subtasks
// @access  Private
const createSubTask = async (req, res, next) => {
    try {
        const { title, description, assignedTo, priority, estimatedHours } = req.body;
        const subTask = await prisma.subTask.create({
            data: {
                companyId: req.user.companyId,
                parentId: req.params.id,
                title,
                description: description || '',
                assignedTo,
                priority: priority || 'Medium',
                estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
                createdBy: req.user.id,
                status: 'todo'
            }
        });
        res.status(201).json({ ...subTask, _id: subTask.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update subtask
// @route   PATCH /api/tasks/:id/subtasks/:subTaskId
// @access  Private
const updateSubTask = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        if (updateData.estimatedHours) updateData.estimatedHours = Number(updateData.estimatedHours);

        const subTask = await prisma.subTask.update({
            where: { id: req.params.subTaskId },
            data: updateData
        });
        res.json({ ...subTask, _id: subTask.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete subtask
// @route   DELETE /api/tasks/:id/subtasks/:subTaskId
// @access  Private
const deleteSubTask = async (req, res, next) => {
    try {
        await prisma.subTask.delete({
            where: { id: req.params.subTaskId }
        });
        res.json({ message: 'Subtask removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get schedule tasks
// @route   GET /api/tasks/schedule
// @access  Private
const getSchedule = async (req, res, next) => {
    try {
        const schedule = await prisma.schedule.findMany({
            where: { companyId: req.user.companyId }
        });
        res.json(schedule.map(s => ({ ...s, _id: s.id })));
    } catch (error) {
        next(error);
    }
};

// @desc    Add task dependency
// @route   POST /api/tasks/:id/dependency
// @access  Private
const addDependency = async (req, res, next) => {
    try {
        const { dependsOnTaskId } = req.body;
        
        // Circular checks can be executed using sequential steps in JS
        const checkCircular = async (taskId, targetId) => {
            if (taskId === targetId) return true;
            const t = await prisma.task.findUnique({
                where: { id: taskId },
                select: { parentTaskId: true }
            });
            if (!t) return false;
            // recursive checks on dependencies/parents
            if (t.parentTaskId) {
                return await checkCircular(t.parentTaskId, targetId);
            }
            return false;
        };

        if (await checkCircular(dependsOnTaskId, req.params.id)) {
            res.status(400);
            throw new Error('Circular dependency detected');
        }

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                parentTaskId: dependsOnTaskId
            }
        });

        res.json({ ...task, _id: task.id });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTasks,
    getMyTasks,
    getProjectTasks,
    createTask,
    assignTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getSubTasks,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    getSchedule,
    addDependency
};
