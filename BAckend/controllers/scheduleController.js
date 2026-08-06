const prisma = require('../config/prisma');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        if (req.query.projectId) {
            where.projectId = req.query.projectId;
        }

        const schedules = await prisma.schedule.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } }
            },
            orderBy: { startDate: 'asc' }
        });

        res.json(schedules.map(s => ({
            ...s,
            _id: s.id,
            projectId: s.project ? { _id: s.project.id, name: s.project.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private (PM, COMPANY_OWNER)
const createSchedule = async (req, res, next) => {
    try {
        const { projectId, title, startDate, endDate, status } = req.body;
        const schedule = await prisma.schedule.create({
            data: {
                title: title || 'Untitled Schedule',
                projectId,
                companyId: req.user.companyId,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : new Date(),
                status: status || 'PLANNED'
            }
        });
        res.status(201).json({ ...schedule, _id: schedule.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update schedule
// @route   PATCH /api/schedules/:id
// @access  Private
const updateSchedule = async (req, res, next) => {
    try {
        const schedule = await prisma.schedule.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;
        delete updateData.companyId;

        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const updatedSchedule = await prisma.schedule.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ ...updatedSchedule, _id: updatedSchedule.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private
const deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await prisma.schedule.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        await prisma.schedule.delete({ where: { id: req.params.id } });
        res.json({ message: 'Schedule removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
