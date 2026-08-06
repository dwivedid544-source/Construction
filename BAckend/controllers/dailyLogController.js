const prisma = require('../config/prisma');

// @desc    Get all daily logs
// @route   GET /api/dailylogs
// @access  Private
const getDailyLogs = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { clientId: req.user._id || req.user.id },
                select: { id: true }
            });
            const projectIds = clientProjects.map(p => p.id);
            where.projectId = { in: projectIds };
        } else if (['FOREMAN', 'WORKER'].includes(req.user.role)) {
            where.engineerId = req.user._id || req.user.id;
        }

        if (req.query.projectId) {
            where.projectId = req.query.projectId;
        }

        const logs = await prisma.dailyLog.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                engineer: { select: { id: true, name: true, roleId: true } }
            },
            orderBy: { logDate: 'desc' }
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            projectId: l.project ? { _id: l.project.id, name: l.project.name } : null,
            reportedBy: l.engineer ? { _id: l.engineer.id, fullName: l.engineer.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create daily log
// @route   POST /api/dailylogs
// @access  Private (Foreman, PM)
const createDailyLog = async (req, res, next) => {
    try {
        const { projectId, weather, notes, workerCount } = req.body;

        const log = await prisma.dailyLog.create({
            data: {
                projectId,
                companyId: req.user.companyId,
                engineerId: req.user._id || req.user.id,
                weather: typeof weather === 'object' ? JSON.stringify(weather) : (weather || null),
                notes: typeof notes === 'object' ? JSON.stringify(notes) : (notes || null),
                workerCount: workerCount ? parseInt(workerCount) : 0,
                approved: false
            }
        });

        res.status(201).json({ ...log, _id: log.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify daily log
// @route   POST /api/dailylogs/:id/verify
// @access  Private (PM, Owners)
const verifyDailyLog = async (req, res, next) => {
    try {
        const log = await prisma.dailyLog.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!log) {
            res.status(404);
            throw new Error('Daily log not found');
        }

        const updated = await prisma.dailyLog.update({
            where: { id: req.params.id },
            data: { approved: true }
        });

        res.json({ ...updated, _id: updated.id, isVerified: true });
    } catch (error) {
        next(error);
    }
};

const deleteDailyLog = async (req, res, next) => {
    try {
        const log = await prisma.dailyLog.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!log) {
            res.status(404);
            throw new Error('Daily log not found');
        }
        await prisma.dailyLog.delete({ where: { id: req.params.id } });
        res.json({ message: 'Daily log removed' });
    } catch (error) {
        next(error);
    }
};

const updateDailyLog = async (req, res, next) => {
    try {
        const log = await prisma.dailyLog.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!log) {
            res.status(404);
            throw new Error('Daily log not found');
        }

        const { weather, notes, workerCount, approved } = req.body;
        const updateData = {};
        if (weather !== undefined) updateData.weather = typeof weather === 'object' ? JSON.stringify(weather) : weather;
        if (notes !== undefined) updateData.notes = typeof notes === 'object' ? JSON.stringify(notes) : notes;
        if (workerCount !== undefined) updateData.workerCount = parseInt(workerCount);
        if (approved !== undefined) updateData.approved = approved;

        const updatedLog = await prisma.dailyLog.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                engineer: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedLog,
            _id: updatedLog.id,
            projectId: updatedLog.project ? { _id: updatedLog.project.id, name: updatedLog.project.name } : null,
            reportedBy: updatedLog.engineer ? { _id: updatedLog.engineer.id, fullName: updatedLog.engineer.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get daily log reports (Summary + Charts)
// @route   GET /api/dailylogs/reports
// @access  Private (Admin, PM)
const getDailyLogReports = async (req, res, next) => {
    try {
        const { projectId, from, to } = req.query;
        const where = { companyId: req.user.companyId };

        if (projectId) where.projectId = projectId;
        if (from || to) {
            where.logDate = {};
            if (from) where.logDate.gte = new Date(from);
            if (to) where.logDate.lte = new Date(to);
        }

        const logs = await prisma.dailyLog.findMany({
            where,
            orderBy: { logDate: 'asc' }
        });

        const totalLogs = logs.length;
        const distinctDays = new Set(logs.map(l => l.logDate.toISOString().split('T')[0])).size;
        const totalManpower = logs.reduce((sum, l) => sum + (l.workerCount || 0), 0);

        res.json({
            summary: {
                totalLogs,
                distinctDays,
                totalManpower,
                avgWorkers: distinctDays > 0 ? (totalManpower / distinctDays).toFixed(1) : 0
            },
            charts: {
                manpowerTrend: logs.map(l => ({ date: l.logDate.toISOString().split('T')[0], count: l.workerCount || 0 })),
                weatherChart: [],
                activityChart: []
            },
            logs: logs.map(l => ({
                date: l.logDate,
                weather: l.weather,
                workPerformed: l.notes,
                manpower: l.workerCount
            }))
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDailyLogs,
    createDailyLog,
    verifyDailyLog,
    updateDailyLog,
    deleteDailyLog,
    getDailyLogReports
};
