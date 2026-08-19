const prisma = require('../config/prisma');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
    try {
        const query = { companyId: req.user.companyId };

        if (req.query.projectId) {
            query.projectId = req.query.projectId;
        }

        const schedules = await prisma.schedule.findMany({
            where: query,
            include: {
                project: { select: { name: true } },
                assignee: { select: { fullName: true, email: true } },
                creator: { select: { fullName: true } }
            }
        });

        res.json(schedules.map(s => ({
            ...s,
            _id: s.id,
            projectId: s.project,
            assignedTo: s.assignee,
            createdBy: s.creator
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
        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        const schedule = await prisma.schedule.create({
            data: {
                ...data,
                companyId: req.user.companyId,
                createdBy: req.user.id
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

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        const updatedSchedule = await prisma.schedule.update({
            where: { id: req.params.id },
            data
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

        await prisma.schedule.delete({
            where: { id: req.params.id }
        });
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
