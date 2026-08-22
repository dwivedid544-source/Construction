const prisma = require('../config/prisma');

// @desc    Get all daily logs
// @route   GET /api/dailylogs
// @access  Private
const getDailyLogs = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { clientId: req.user.id },
                select: { id: true }
            });
            const projectIds = clientProjects.map(p => p.id);
            whereClause.projectId = { in: projectIds };
        }

        if (req.query.projectId && req.query.projectId !== 'ALL') {
            whereClause.projectId = req.query.projectId;
        }
        if (req.query.date) {
            whereClause.date = new Date(req.query.date);
        }

        const logs = await prisma.dailyLog.findMany({
            where: whereClause,
            include: {
                project: { select: { id: true, name: true } },
                creator: { select: { id: true, fullName: true, role: true } }
            },
            orderBy: { date: 'desc' }
        });

        const mappedLogs = logs.map(l => ({
            ...l,
            _id: l.id || l._id,
            projectId: l.project || { name: 'Active Project' },
            reportedBy: l.reportedBy || l.creator || { fullName: 'Admin', role: req.user.role }
        }));

        res.json(mappedLogs);
    } catch (error) {
        next(error);
    }
};

// @desc    Create daily log
// @route   POST /api/dailylogs
// @access  Private (Owner, PM, Foreman, Worker)
const createDailyLog = async (req, res, next) => {
    try {
        let photos = [];
        if (req.files && req.files.length > 0) {
            photos = req.files.map(file => file.path || file.secure_url || file.url);
        }

        const { projectId, date, weather, notes, workPerformed, visitors, safetyIncidents, manpower, location, materialsReceived, equipmentUsed, delays, safetyObservations } = req.body;

        const parseJsonField = (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return val;
                }
            }
            return val;
        };

        const log = await prisma.dailyLog.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                date: date ? new Date(date) : new Date(),
                weather: typeof weather === 'string' ? parseJsonField(weather) : weather,
                notes: notes || '',
                createdBy: req.user.id,
                reportedBy: req.user.id,
                workPerformed: typeof workPerformed === 'object' ? JSON.stringify(workPerformed) : String(workPerformed || ''),
                manpower: parseJsonField(manpower) || [],
                visitors: parseJsonField(visitors) || [],
                materialsReceived: parseJsonField(materialsReceived) || [],
                equipmentUsed: parseJsonField(equipmentUsed) || [],
                delays: delays || '',
                safetyObservations: safetyObservations || '',
                photos: photos,
                location: parseJsonField(location) || null
            }
        });

        res.status(201).json({
            ...log,
            _id: log.id,
            projectId: { _id: projectId },
            reportedBy: { fullName: req.user.fullName, role: req.user.role }
        });
    } catch (error) {
        console.error('createDailyLog error:', error);
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
            data: {
                // if verified logic exists, otherwise we can save JSON status
                notes: log.notes + `\n[Verified by ${req.user.fullName}]`
            }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

const deleteDailyLog = async (req, res, next) => {
    try {
        const log = await prisma.dailyLog.deleteMany({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (log.count === 0) {
            res.status(404);
            throw new Error('Daily log not found');
        }
        res.json({ message: 'Daily log removed' });
    } catch (error) {
        next(error);
    }
};

const updateDailyLog = async (req, res, next) => {
    try {
        const log = await prisma.dailyLog.findUnique({
            where: { id: req.params.id }
        });
        if (!log) {
            res.status(404);
            throw new Error('Daily log not found');
        }

        if (['FOREMAN', 'WORKER'].includes(req.user.role) && log.createdBy !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this log' });
        }

        const { date, weather, notes, workPerformed, visitors, safetyIncidents } = req.body;

        const parseJsonField = (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return val;
                }
            }
            return val;
        };

        const updatedLog = await prisma.dailyLog.update({
            where: { id: req.params.id },
            data: {
                date: date ? new Date(date) : log.date,
                weather: typeof weather === 'object' ? JSON.stringify(weather) : (weather || log.weather),
                notes: notes !== undefined ? notes : log.notes,
                workPerformed: workPerformed ? parseJsonField(workPerformed) : log.workPerformed,
                visitors: visitors ? parseJsonField(visitors) : log.visitors,
                safetyIncidents: safetyIncidents ? parseJsonField(safetyIncidents) : log.safetyIncidents
            },
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            }
        });

        res.json({
            ...updatedLog,
            _id: updatedLog.id,
            projectId: updatedLog.project,
            reportedBy: updatedLog.creator
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
        const whereClause = { companyId: req.user.companyId };

        if (req.user.role === 'PM') {
            const pmProjects = await prisma.project.findMany({
                where: {
                    OR: [
                        { pms: { some: { id: req.user.id } } },
                        { pmId: req.user.id },
                        { createdBy: req.user.id }
                    ]
                },
                select: { id: true }
            });
            const projectIds = pmProjects.map(p => p.id);

            if (projectId) {
                if (!projectIds.includes(projectId)) {
                    return res.status(403).json({ message: 'Not authorized for this project' });
                }
                whereClause.projectId = projectId;
            } else {
                whereClause.projectId = { in: projectIds };
            }
        } else if (projectId) {
            whereClause.projectId = projectId;
        }

        if (from || to) {
            whereClause.date = {};
            if (from) whereClause.date.gte = new Date(from);
            if (to) whereClause.date.lte = new Date(to);
        }

        const logs = await prisma.dailyLog.findMany({
            where: whereClause,
            orderBy: { date: 'asc' }
        });

        const totalLogs = logs.length;
        const distinctDays = new Set(logs.map(l => l.date.toISOString().split('T')[0])).size;

        // Javascript parsing for complex fields
        let totalManpower = 0;
        const manpowerTrend = [];
        const weatherDist = {};

        logs.forEach(log => {
            let manpower = [];
            if (typeof log.workPerformed === 'string') {
                try { manpower = JSON.parse(log.workPerformed).manpower || []; } catch (e) {}
            } else if (log.workPerformed && Array.isArray(log.workPerformed.manpower)) {
                manpower = log.workPerformed.manpower;
            }

            let logCount = 0;
            manpower.forEach(m => {
                const c = Number(m.count) || 0;
                totalManpower += c;
                logCount += c;
            });

            const dateStr = log.date.toISOString().split('T')[0];
            manpowerTrend.push({ date: dateStr, count: logCount });

            let logWeather = {};
            if (typeof log.weather === 'string') {
                try { logWeather = JSON.parse(log.weather); } catch (e) { logWeather = { status: log.weather }; }
            } else if (log.weather) {
                logWeather = log.weather;
            }
            const status = logWeather.status || 'Unknown';
            weatherDist[status] = (weatherDist[status] || 0) + 1;
        });

        const weatherChart = Object.keys(weatherDist).map(k => ({ name: k, value: weatherDist[k] }));

        res.json({
            summary: {
                totalLogs,
                distinctDays,
                totalManpower,
                avgWorkers: distinctDays > 0 ? (totalManpower / distinctDays).toFixed(1) : 0
            },
            charts: {
                manpowerTrend,
                weatherChart,
                activityChart: [] // Fallback/empty list for simple summary
            },
            logs: logs.map(l => ({
                date: l.date,
                weather: l.weather,
                workPerformed: l.workPerformed,
                manpower: []
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
