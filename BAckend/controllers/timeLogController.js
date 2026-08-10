const prisma = require('../config/prisma');

// @desc    Clock In
// @route   POST /api/timelogs/clock-in
// @access  Private
const clockIn = async (req, res, next) => {
    try {
        const { projectId, taskId, userId: bodyUserId } = req.body;
        const targetUserId = bodyUserId || req.user._id || req.user.id;
        const companyId = req.user.companyId;

        const activeLog = await prisma.timeLog.findFirst({
            where: { userId: targetUserId, clockOut: null }
        });

        if (activeLog) {
            res.status(400);
            throw new Error('User already clocked in');
        }

        const log = await prisma.timeLog.create({
            data: {
                userId: targetUserId,
                projectId: projectId || null,
                companyId: companyId,
                clockIn: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, roleId: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...log,
            _id: log.id,
            userId: log.user ? { _id: log.user.id, fullName: log.user.name } : null,
            worker: log.user ? { id: log.user.id, name: log.user.name } : null,
            projectId: log.project ? { _id: log.project.id, name: log.project.name } : null
        });
    } catch (error) {
        next(error);
    }
};

const clockOut = async (req, res, next) => {
    try {
        const { userId: bodyUserId } = req.body;
        const targetUserId = bodyUserId || req.user._id || req.user.id;

        const log = await prisma.timeLog.findFirst({
            where: { userId: targetUserId, clockOut: null }
        });

        if (!log) {
            res.status(400);
            throw new Error('User not clocked in');
        }

        const clockOutTime = new Date();
        const durationHours = Math.max(0, Math.round(((clockOutTime - new Date(log.clockIn)) / (1000 * 60 * 60)) * 100) / 100);

        const updated = await prisma.timeLog.update({
            where: { id: log.id },
            data: {
                clockOut: clockOutTime,
                durationHours
            },
            include: {
                user: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            userId: updated.user ? { _id: updated.user.id, fullName: updated.user.name } : null,
            worker: updated.user ? { id: updated.user.id, name: updated.user.name } : null,
            projectId: updated.project ? { _id: updated.project.id, name: updated.project.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get TimeLogs
// @route   GET /api/timelogs
// @access  Private
const getTimeLogs = async (req, res, next) => {
    try {
        const where = { deletedAt: null };
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId) {
            where.companyId = req.user.companyId;
        }
        if (req.query.userId && req.query.userId !== 'undefined' && req.query.userId !== 'null') {
            where.userId = req.query.userId;
        }
        if (req.query.projectId && req.query.projectId !== 'undefined' && req.query.projectId !== 'null') {
            where.projectId = req.query.projectId;
        }

        const logs = await prisma.timeLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, roleId: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            userId: l.user ? { _id: l.user.id, fullName: l.user.name } : null,
            worker: l.user ? { id: l.user.id, name: l.user.name } : null,
            projectId: l.project ? { _id: l.project.id, name: l.project.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Update TimeLog (Approve/Reject)
// @route   PATCH /api/timelogs/:id
// @access  Private (PM, COMPANY_OWNER)
const updateTimeLog = async (req, res, next) => {
    try {
        const log = await prisma.timeLog.findUnique({ where: { id: req.params.id } });

        if (!log) {
            res.status(404);
            throw new Error('TimeLog not found');
        }

        const { status, durationMinutes, durationHours } = req.body;
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (durationHours !== undefined) updateData.durationHours = parseFloat(durationHours);
        else if (durationMinutes !== undefined) updateData.durationHours = parseFloat((parseInt(durationMinutes) / 60).toFixed(2));

        const updatedLog = await prisma.timeLog.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                user: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedLog,
            _id: updatedLog.id,
            userId: updatedLog.user ? { _id: updatedLog.user.id, fullName: updatedLog.user.name } : null,
            worker: updatedLog.user ? { id: updatedLog.user.id, name: updatedLog.user.name } : null,
            projectId: updatedLog.project ? { _id: updatedLog.project.id, name: updatedLog.project.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete TimeLog
// @route   DELETE /api/timelogs/:id
// @access  Private (PM, COMPANY_OWNER)
const deleteTimeLog = async (req, res, next) => {
    try {
        const log = await prisma.timeLog.findUnique({ where: { id: req.params.id } });

        if (!log) {
            res.status(404);
            throw new Error('TimeLog not found');
        }

        await prisma.timeLog.delete({ where: { id: req.params.id } });
        res.json({ message: 'TimeLog removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    clockIn,
    clockOut,
    getTimeLogs,
    updateTimeLog,
    deleteTimeLog
};
