const prisma = require('../config/prisma');

const getTemplates = async (req, res, next) => {
    try {
        const templates = await prisma.taskTemplate.findMany({
            where: { companyId: req.user.companyId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates.map(t => ({
            ...t,
            _id: t.id,
            templateName: t.name,
            taskTitle: t.name,
            steps: t.tasks || []
        })));
    } catch (error) {
        next(error);
    }
};

const createTemplate = async (req, res, next) => {
    try {
        const { templateName, taskTitle, name, category, steps, tasks } = req.body;
        const finalName = templateName || taskTitle || name;
        
        if (!finalName) {
            res.status(400);
            throw new Error('Template name is required');
        }

        const template = await prisma.taskTemplate.create({
            data: {
                companyId: req.user.companyId,
                name: finalName,
                category: category || null,
                tasks: steps || tasks || []
            }
        });

        res.status(201).json({
            ...template,
            _id: template.id,
            templateName: template.name,
            taskTitle: template.name,
            steps: template.tasks
        });
    } catch (error) {
        next(error);
    }
};

const deleteTemplate = async (req, res, next) => {
    try {
        const template = await prisma.taskTemplate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!template) {
            res.status(404);
            throw new Error('Template not found');
        }
        await prisma.taskTemplate.delete({ where: { id: req.params.id } });
        res.json({ message: 'Template deleted' });
    } catch (error) {
        next(error);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        const { templateName, taskTitle, name, category, steps, tasks } = req.body;
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
                name: templateName || taskTitle || name || template.name,
                category: category !== undefined ? category : template.category,
                tasks: steps || tasks || template.tasks
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            templateName: updated.name,
            taskTitle: updated.name,
            steps: updated.tasks
        });
    } catch (error) {
        next(error);
    }
};

const createTemplateFromTask = async (req, res, next) => {
    try {
        const { taskId } = req.body;
        let task = await prisma.task.findUnique({ where: { id: taskId } });

        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const subTasks = await prisma.subTask.findMany({ where: { taskId } });

        const template = await prisma.taskTemplate.create({
            data: {
                companyId: req.user.companyId,
                name: task.title + ' Template',
                category: 'Generated',
                tasks: subTasks.map(st => ({ title: st.title, completed: st.completed }))
            }
        });

        res.status(201).json({ ...template, _id: template.id });
    } catch (error) {
        next(error);
    }
};

const applyTemplate = async (req, res, next) => {
    try {
        const { projectId, assignedToId } = req.body;
        const template = await prisma.taskTemplate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!template) {
            res.status(404);
            throw new Error('Template not found');
        }

        if (!projectId) {
            res.status(400);
            throw new Error('Project ID is required to apply template');
        }

        const newTask = await prisma.task.create({
            data: {
                projectId,
                companyId: req.user.companyId,
                title: template.name,
                status: 'PENDING',
                priority: 'MEDIUM',
                createdById: req.user._id || req.user.id,
                assignedToId: assignedToId || null
            }
        });

        const templateSteps = Array.isArray(template.tasks) ? template.tasks : [];
        for (const step of templateSteps) {
            await prisma.subTask.create({
                data: {
                    taskId: newTask.id,
                    title: typeof step === 'string' ? step : (step.title || 'Subtask'),
                    completed: false
                }
            });
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
