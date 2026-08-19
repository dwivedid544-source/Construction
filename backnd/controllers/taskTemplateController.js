const prisma = require('../config/prisma');

const getTemplates = async (req, res, next) => {
    try {
        const templates = await prisma.taskTemplate.findMany({
            where: { companyId: req.user.companyId },
            include: { creator: { select: { fullName: true } } },
            orderBy: [{ position: 'asc' }, { createdAt: 'desc' }]
        });
        res.json(templates.map(t => ({
            ...t,
            _id: t.id,
            createdBy: t.creator
        })));
    } catch (error) {
        next(error);
    }
};

const createTemplate = async (req, res, next) => {
    try {
        const { templateName, taskTitle, description, assignedRole, estimatedHours, priority, steps } = req.body;
        
        if (!templateName || !taskTitle || !assignedRole) {
            res.status(400);
            throw new Error('Template name, assigned role, and task title are required');
        }

        const template = await prisma.taskTemplate.create({
            data: {
                companyId: req.user.companyId,
                templateName,
                taskTitle,
                description: description || '',
                assignedRole,
                estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
                priority: priority || 'Medium',
                steps: typeof steps === 'string' ? JSON.parse(steps) : (steps || []),
                createdBy: req.user.id
            }
        });

        res.status(201).json({ ...template, _id: template.id });
    } catch (error) {
        next(error);
    }
};

const deleteTemplate = async (req, res, next) => {
    try {
        const deleted = await prisma.taskTemplate.deleteMany({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (deleted.count === 0) {
            res.status(404);
            throw new Error('Template not found');
        }
        res.json({ message: 'Template deleted' });
    } catch (error) {
        next(error);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        const { templateName, taskTitle, description, assignedRole, estimatedHours, priority, steps } = req.body;
        const template = await prisma.taskTemplate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        
        if (!template) {
            res.status(404);
            throw new Error('Template not found');
        }

        const updated = await prisma.taskTemplate.update({
            where: { id: req.params.id },
            data: {
                templateName: templateName || template.templateName,
                taskTitle: taskTitle || template.taskTitle,
                description: description !== undefined ? description : template.description,
                assignedRole: assignedRole || template.assignedRole,
                estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : template.estimatedHours,
                priority: priority || template.priority,
                steps: steps || template.steps
            }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

const createSubTasksFromSteps = async (taskId, onModel, steps, companyId, createdBy, parentId = null, assignedTo = null) => {
    if (!steps || steps.length === 0) return 0;
    let count = 0;

    for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const subTask = await prisma.subTask.create({
            data: {
                parentId: taskId,
                parentType: onModel === 'JobTask' ? 'JobTask' : 'Task',
                companyId,
                title: step.title,
                description: step.remarks || step.description || '',
                priority: step.priority || 'Medium',
                createdBy,
                assignedTo: step.assignedTo || assignedTo || null,
                status: 'todo'
            }
        });

        count++;

        if (step.steps && step.steps.length > 0) {
            const childCount = await createSubTasksFromSteps(taskId, onModel, step.steps, companyId, createdBy, subTask.id, assignedTo);
            count += childCount;
        }
    }
    return count;
};

const mapSubTasksToSteps = async (taskId, parentId = null) => {
    // Basic mapping or lookup
    const subTasks = await prisma.subTask.findMany({
        where: { parentId }
    });
    const steps = [];

    for (const st of subTasks) {
        steps.push({
            title: st.title,
            remarks: st.description || '',
            priority: st.priority || 'Medium',
            steps: await mapSubTasksToSteps(taskId, st.id)
        });
    }
    return steps;
};

const createTemplateFromTask = async (req, res, next) => {
    try {
        const { taskId, isJobTask } = req.body;
        let task;
        let onModel = isJobTask ? 'JobTask' : 'Task';
        
        if (onModel === 'JobTask') {
            task = await prisma.jobTask.findFirst({ where: { id: taskId, companyId: req.user.companyId } });
        } else {
            task = await prisma.task.findFirst({ where: { id: taskId, companyId: req.user.companyId } });
        }

        if (!task) {
            task = await prisma.subTask.findFirst({ where: { id: taskId, companyId: req.user.companyId } });
            if (task) {
                const steps = await mapSubTasksToSteps(task.parentId, task.id);
                const template = await prisma.taskTemplate.create({
                    data: {
                        companyId: req.user.companyId,
                        templateName: task.title + ' Template',
                        taskTitle: task.title,
                        description: task.description || '',
                        assignedRole: 'WORKER',
                        estimatedHours: 0,
                        priority: task.priority || 'Medium',
                        steps,
                        createdBy: req.user.id
                    }
                });
                return res.status(201).json({ ...template, _id: template.id });
            }
        }

        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const steps = await mapSubTasksToSteps(taskId);

        const template = await prisma.taskTemplate.create({
            data: {
                companyId: req.user.companyId,
                templateName: task.title + ' Template',
                taskTitle: task.title,
                description: task.description || '',
                assignedRole: 'WORKER',
                estimatedHours: 0,
                priority: task.priority || 'Medium',
                steps,
                createdBy: req.user.id
            }
        });

        res.status(201).json({ ...template, _id: template.id });
    } catch (error) {
        next(error);
    }
};

const applyTemplate = async (req, res, next) => {
    try {
        const { jobId, projectId, assignedTo } = req.body;
        const template = await prisma.taskTemplate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!template) {
            res.status(404);
            throw new Error('Template not found');
        }

        if (!jobId && !projectId) {
            res.status(400);
            throw new Error('Job ID or Project ID is required to apply template');
        }

        let newTask;
        if (jobId) {
            newTask = await prisma.jobTask.create({
                data: {
                    jobId,
                    companyId: req.user.companyId,
                    title: template.taskTitle,
                    description: template.description,
                    priority: template.priority.toLowerCase(),
                    assignedRoleType: template.assignedRole || '',
                    assignedWorker: assignedTo || null,
                    createdBy: req.user.id,
                }
            });

            if (template.steps && Array.isArray(template.steps) && template.steps.length > 0) {
                const subTaskCount = await createSubTasksFromSteps(newTask.id, 'JobTask', template.steps, req.user.companyId, req.user.id, null, assignedTo);
                newTask = await prisma.jobTask.update({
                    where: { id: newTask.id },
                    data: { subTaskCount }
                });
            }
        } else if (projectId) {
            newTask = await prisma.task.create({
                data: {
                    projectId,
                    companyId: req.user.companyId,
                    title: template.taskTitle,
                    description: template.description,
                    priority: template.priority,
                    assignedRoleType: template.assignedRole || '',
                    assignedTo: assignedTo || null,
                    createdBy: req.user.id,
                }
            });

            if (template.steps && Array.isArray(template.steps) && template.steps.length > 0) {
                const subTaskCount = await createSubTasksFromSteps(newTask.id, 'Task', template.steps, req.user.companyId, req.user.id, null, assignedTo);
                newTask = await prisma.task.update({
                    where: { id: newTask.id },
                    data: { subTaskCount }
                });
            }
        }

        res.status(201).json({ message: 'Template applied successfully', task: { ...newTask, _id: newTask.id } });
    } catch (error) {
        next(error);
    }
};

const bulkDeleteTemplates = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            res.status(400);
            throw new Error('Template IDs are required in an array');
        }
        await prisma.taskTemplate.deleteMany({
            where: { id: { in: ids }, companyId: req.user.companyId }
        });
        res.json({ message: 'Templates deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const reorderTemplates = async (req, res, next) => {
    try {
        const { templates } = req.body;
        if (!templates || !Array.isArray(templates)) {
            res.status(400);
            throw new Error('Templates array is required');
        }

        await prisma.$transaction(
            templates.map(t => prisma.taskTemplate.update({
                where: { id: t.id },
                data: { position: t.position }
            }))
        );

        res.json({ message: 'Templates reordered successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTemplates,
    createTemplate,
    deleteTemplate,
    updateTemplate,
    applyTemplate,
    createTemplateFromTask,
    bulkDeleteTemplates,
    reorderTemplates
};
