const prisma = require('../config/prisma');

// @desc    Clock In
// @route   POST /api/timelogs/clock-in
// @access  Private
const clockIn = async (req, res, next) => {
    try {
        const { projectId, taskId, userId } = req.body;
        const workerId = userId || req.user._id || req.user.id;

        const activeLog = await prisma.timeLog.findFirst({
            where: { workerId, clockOut: null }
        });

        if (activeLog) {
            res.status(400);
            throw new Error('User already clocked in');
        }

        const log = await prisma.timeLog.create({
            data: {
                workerId,
                projectId,
                taskId: taskId || null,
                clockIn: new Date(),
                status: 'PENDING'
            },
            include: {
                worker: { select: { id: true, name: true, roleId: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...log,
            _id: log.id,
            userId: log.worker ? { _id: log.worker.id, fullName: log.worker.name } : null,
            projectId: log.project ? { _id: log.project.id, name: log.project.name } : null
        });
    } catch (error) {
        next(error);
    }
};

const clockOut = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const workerId = userId || req.user._id || req.user.id;

        const log = await prisma.timeLog.findFirst({
            where: { workerId, clockOut: null }
        });

        if (!log) {
            res.status(400);
            throw new Error('User not clocked in');
        }

        const clockOutTime = new Date();
        const durationMinutes = Math.max(0, Math.round((clockOutTime - new Date(log.clockIn)) / (1000 * 60)));

        const updated = await prisma.timeLog.update({
            where: { id: log.id },
            data: {
                clockOut: clockOutTime,
                durationMinutes
            },
            include: {
                worker: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            userId: updated.worker ? { _id: updated.worker.id, fullName: updated.worker.name } : null,
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
        if (req.query.userId && req.query.userId !== 'undefined' && req.query.userId !== 'null') {
            where.workerId = req.query.userId;
        }
        if (req.query.projectId && req.query.projectId !== 'undefined' && req.query.projectId !== 'null') {
            where.projectId = req.query.projectId;
        }

        const logs = await prisma.timeLog.findMany({
            where,
            include: {
                worker: { select: { id: true, name: true, roleId: true } },
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            userId: l.worker ? { _id: l.worker.id, fullName: l.worker.name } : null,
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

        const { status, durationMinutes, hourlyRate } = req.body;
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes);
        if (hourlyRate !== undefined) updateData.hourlyRate = parseFloat(hourlyRate);

        const updatedLog = await prisma.timeLog.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                worker: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedLog,
            _id: updatedLog.id,
            userId: updatedLog.worker ? { _id: updatedLog.worker.id, fullName: updatedLog.worker.name } : null,
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
