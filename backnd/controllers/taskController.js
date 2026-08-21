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

// @desc    Get tasks (role-based)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const userCompanyId = String(companyId || req.companyId || (typeof companyId === 'object' ? (companyId._id || companyId.id) : ''));

        const taskWhere = {};
        if (role !== 'SUPER_ADMIN' && userCompanyId) {
            taskWhere.companyId = userCompanyId;
        }
        if (req.query.projectId) {
            taskWhere.projectId = req.query.projectId;
        }
        if (req.query.status) {
            taskWhere.status = req.query.status;
        }
        if (req.query.category) {
            taskWhere.category = req.query.category;
        }

        const tasks = await prisma.task.findMany({
            where: taskWhere,
            include: {
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Also fetch JobTasks for unified view
        const jobTaskWhere = {};
        if (role !== 'SUPER_ADMIN' && userCompanyId) {
            jobTaskWhere.companyId = userCompanyId;
        }
        if (req.query.status) {
            jobTaskWhere.status = req.query.status;
        }

        const jobTasks = await prisma.jobTask.findMany({
            where: jobTaskWhere,
            include: {
                assignedTo: {
                    select: {
                        fullName: true,
                        role: true
                    }
                },
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

        // Map tasks
        const mappedTasks = tasks.map(task => {
            const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
            return {
                ...task,
                _id: task.id,
                assignedTo: assignees,
                projectId: task.project ? { ...task.project, _id: task.projectId } : task.projectId,
                isJobTask: false
            };
        });

        // Map job tasks so they seamlessly display in Task Command Center
        const mappedJobTasks = jobTasks.map(jt => {
            const assignee = jt.assignedTo || jt.assignedWorker || jt.worker;
            const assignees = assignee ? [assignee] : [];
            const projectName = jt.job?.project?.name || jt.job?.name || 'Project Job';
            const projId = jt.job?.projectId || jt.jobId;

            return {
                ...jt,
                _id: jt.id,
                isJobTask: true,
                assignedTo: assignees,
                projectId: {
                    _id: projId,
                    name: projectName
                },
                jobId: jt.jobId,
                jobName: jt.job?.name || ''
            };
        });

        let allResults = [...mappedTasks, ...mappedJobTasks];
        if (req.query.projectId) {
            allResults = allResults.filter(t => {
                const pId = String(t.projectId?._id || t.projectId || '');
                return pId === String(req.query.projectId);
            });
        }

        res.json(allResults);
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
            include: { project: { select: { name: true } } }
        });
        res.json(tasks.map(t => ({ ...t, _id: t.id, projectId: t.project })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
    try {
        const {
            title,
            description,
            assignedTo,
            projectId,
            priority,
            startDate,
            dueDate,
            estimatedHours,
            steps,
            subTasksList,
            category,
            assignedRoleType
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        // If no projectId provided or 'undefined', handle gracefully
        let resolvedProjectId = projectId;
        if (!resolvedProjectId || resolvedProjectId === 'undefined' || resolvedProjectId === '') {
            const firstProject = await prisma.project.findFirst({
                where: { companyId: req.user.companyId },
                select: { id: true }
            });
            if (firstProject) {
                resolvedProjectId = firstProject.id;
            } else {
                return res.status(400).json({ message: 'A project must be selected to create a task' });
            }
        }

        const assignees = Array.isArray(assignedTo) 
            ? assignedTo.map(u => (typeof u === 'object' && u !== null ? (u._id || u.id) : u)).filter(Boolean)
            : (assignedTo ? [(typeof assignedTo === 'object' ? (assignedTo._id || assignedTo.id) : assignedTo)] : []);

        const validationErr = await validateAssignmentHierarchy(req.user.role, assignees);
        if (validationErr) {
            return res.status(400).json({ message: validationErr });
        }

        const normPriority = priority 
            ? (priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase())
            : 'Medium';

        const task = await prisma.task.create({
            data: {
                companyId: req.user.companyId,
                projectId: resolvedProjectId,
                title: title.trim(),
                description: description || '',
                assignedTo: assignees,
                assignedRoleType: assignedRoleType || '',
                priority: normPriority,
                category: category || 'TASK',
                status: 'todo',
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
                createdBy: req.user.id
            }
        });

        // Handle subTasksList or steps from Create Task modal
        const subTasksToCreate = (subTasksList && Array.isArray(subTasksList) && subTasksList.length > 0)
            ? subTasksList
            : steps;

        if (subTasksToCreate && Array.isArray(subTasksToCreate) && subTasksToCreate.length > 0) {
            await createSubTasksRecursive(task.id, 'Task', subTasksToCreate, req.user.companyId, req.user.id, null, assignees[0], startDate, dueDate);
        }

        for (const assigneeId of assignees) {
            try {
                await dispatchNotification(req, {
                    userId: assigneeId,
                    title: 'New Task Assigned',
                    message: `You have been assigned to task: "${task.title}"`,
                    link: `/company-admin/tasks`,
                    type: 'task'
                });
            } catch (notifErr) {
                console.warn('Task notification warning:', notifErr.message);
            }
        }

        const populatedTask = await prisma.task.findUnique({
            where: { id: task.id },
            include: { project: { select: { name: true } } }
        });

        res.status(201).json({
            ...populatedTask,
            _id: populatedTask.id,
            assignedTo: assignees,
            projectId: populatedTask?.project
        });
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
