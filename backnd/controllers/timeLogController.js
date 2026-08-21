const prisma = require('../config/prisma');
const https = require('https');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

const reverseGeocode = async (lat, lng) => {
    return new Promise((resolve) => {
        if (!lat && lat !== 0) return resolve(null);
        if (!lng && lng !== 0) return resolve(null);
        
        const options = {
            hostname: 'nominatim.openstreetmap.org',
            path: `/reverse?lat=${lat}&lon=${lng}&format=json`,
            headers: {
                'User-Agent': 'ConstructionSaaS-Backend/1.0',
                'Accept-Language': 'en'
            }
        };

        const req = https.get(options, (res) => {
            if (res.statusCode !== 200) return resolve(null);
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.address) {
                        const addr = json.address;
                        const short = [
                            addr.road || addr.neighbourhood,
                            addr.city || addr.town || addr.village || addr.county,
                            addr.country
                        ].filter(Boolean).join(', ');
                        resolve(short || json.display_name?.split(',').slice(0, 2).join(','));
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });
        
        req.on('error', () => resolve(null));
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(null);
        });
    });
};

const clockIn = async (req, res, next) => {
    try {
        const { projectId, jobId, taskId, latitude, longitude, accuracy, deviceInfo, userId, isManual, reason, clockIn: manualTime } = req.body;
        const targetUserId = userId || req.user.id;

        if (isManual) {
            const allowedRoles = ['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'];
            if (!allowedRoles.includes(req.user.role)) {
                res.status(403);
                throw new Error('Only Admin and Project Managers can perform manual time entry.');
            }
            if (!manualTime) {
                res.status(400);
                throw new Error('Clock-in time is required for manual entry.');
            }
        }

        if (!isManual && ((!latitude && latitude !== 0) || (!longitude && longitude !== 0))) {
            if (!userId || userId === req.user.id) {
                res.status(400);
                throw new Error('Location access is required to clock in. Please enable GPS.');
            }
        }

        if (!isManual && accuracy && accuracy > 200) {
            if (!userId || userId === req.user.id) {
                res.status(400);
                throw new Error('GPS accuracy too low ( > 200m). Please try again in an area with better signal.');
            }
        }

        const activeLog = await prisma.timeLog.findFirst({
            where: { userId: targetUserId, clockOut: null }
        });

        if (activeLog) {
            res.status(400);
            throw new Error('User already clocked in');
        }

        let geofenceStatus = 'unknown';
        let isOutsideGeofence = false;

        if (!isManual && projectId && latitude && longitude) {
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (project) {
                const siteLat = project.siteLatitude || (project.location ? JSON.parse(JSON.stringify(project.location)).latitude : null);
                const siteLon = project.siteLongitude || (project.location ? JSON.parse(JSON.stringify(project.location)).longitude : null);
                const radius = project.allowedRadiusMeters || 100;

                if (siteLat && siteLon) {
                    const distance = calculateDistance(latitude, longitude, siteLat, siteLon);
                    isOutsideGeofence = distance > radius;
                    geofenceStatus = isOutsideGeofence ? 'outside' : 'inside';

                    if (isOutsideGeofence && project.strictGeofence) {
                        res.status(403);
                        throw new Error(`Clock-in blocked: You are ${Math.round(distance - radius)}m outside the allowed site radius.`);
                    }
                }
            }
        }

        const address = await reverseGeocode(latitude, longitude);

        const log = await prisma.timeLog.create({
            data: {
                companyId: req.user.companyId,
                userId: targetUserId,
                projectId,
                jobId: jobId || null,
                clockIn: isManual ? new Date(manualTime) : new Date(),
                clockInLatitude: latitude ? Number(latitude) : null,
                clockInLongitude: longitude ? Number(longitude) : null,
                clockInAccuracy: accuracy ? Number(accuracy) : null,
                geofenceStatus,
                isOutsideGeofence,
                isManual: isManual || false,
                reason: reason || '',
                createdBy: req.user.id,
                createdByRole: req.user.role,
                deviceInfo: isManual ? `Manual Entry by ${req.user.role}` : (deviceInfo || ''),
                clockInAddress: address || ''
            }
        });

        if (taskId) {
            const taskType = req.body.taskType || 'JobTask';
            try {
                if (taskType === 'Task') {
                    await prisma.task.updateMany({
                        where: { id: taskId, status: 'todo' },
                        data: { status: 'in_progress' }
                    });
                } else if (taskType === 'SubTask') {
                    await prisma.subTask.updateMany({
                        where: { id: taskId, status: 'todo' },
                        data: { status: 'in_progress' }
                    });
                } else {
                    await prisma.jobTask.updateMany({
                        where: { id: taskId, status: 'pending' },
                        data: { status: 'in_progress' }
                    });
                }
            } catch (err) {
                console.error(`Error updating assignment status for ${taskType}:`, err);
            }
        }

        if (jobId) {
            await prisma.job.updateMany({
                where: { id: jobId, status: 'planning' },
                data: { status: 'active' }
            });
        }

        const io = req.app.get('io');
        if (io) {
            const populatedLog = await prisma.timeLog.findUnique({
                where: { id: log.id },
                include: { user: { select: { fullName: true, role: true, avatar: true } }, project: { select: { name: true } } }
            });

            io.emit('attendance_update', {
                type: log.clockOut ? 'manual-entry' : 'clock-in',
                userId: targetUserId,
                log: { ...populatedLog, _id: populatedLog.id, userId: populatedLog.user, projectId: populatedLog.project }
            });
        }

        res.status(201).json({ ...log, _id: log.id });
    } catch (error) {
        next(error);
    }
};

const clockOut = async (req, res, next) => {
    try {
        const { latitude, longitude, accuracy, userId, isManual, reason, clockOut: manualTime } = req.body;
        const targetUserId = userId || req.user.id;

        if (isManual) {
            const allowedRoles = ['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'];
            if (!allowedRoles.includes(req.user.role)) {
                res.status(403);
                throw new Error('Only Admin and Project Managers can perform manual time entry.');
            }
            if (!manualTime) {
                res.status(400);
                throw new Error('Clock-out time is required for manual entry.');
            }
        }

        if (!isManual && ((!latitude && latitude !== 0) || (!longitude && longitude !== 0))) {
            if (!userId || userId === req.user.id) {
                res.status(400);
                throw new Error('Location access is required to clock out. Please enable GPS.');
            }
        }

        const log = await prisma.timeLog.findFirst({
            where: { userId: targetUserId, clockOut: null }
        });

        if (!log) {
            res.status(400);
            throw new Error('User not clocked in');
        }

        let isOutsideGeofence = log.isOutsideGeofence;
        let geofenceStatus = log.geofenceStatus;

        if (!isManual && log.projectId && latitude && longitude) {
            const project = await prisma.project.findUnique({ where: { id: log.projectId } });
            if (project) {
                const siteLat = project.siteLatitude || (project.location ? JSON.parse(JSON.stringify(project.location)).latitude : null);
                const siteLon = project.siteLongitude || (project.location ? JSON.parse(JSON.stringify(project.location)).longitude : null);
                const radius = project.allowedRadiusMeters || 100;

                if (siteLat && siteLon) {
                    const distance = calculateDistance(latitude, longitude, siteLat, siteLon);
                    if (distance > radius) {
                        isOutsideGeofence = true;
                        geofenceStatus = 'outside';

                        if (project.strictGeofence) {
                            res.status(403);
                            throw new Error(`Clock-out blocked: You must be within the project site to clock out.`);
                        }
                    }
                }
            }
        }

        const address = await reverseGeocode(latitude, longitude);

        const updated = await prisma.timeLog.update({
            where: { id: log.id },
            data: {
                clockOut: isManual ? new Date(manualTime) : new Date(),
                clockOutLatitude: latitude ? Number(latitude) : null,
                clockOutLongitude: longitude ? Number(longitude) : null,
                clockOutAccuracy: accuracy ? Number(accuracy) : null,
                isOutsideGeofence,
                geofenceStatus,
                isManual: isManual || log.isManual,
                reason: reason || log.reason,
                clockOutAddress: address || ''
            }
        });

        if (log.jobId) {
            await prisma.job.updateMany({
                where: { id: log.jobId, status: 'active' },
                data: { status: 'on-hold' }
            });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('attendance_update', {
                type: 'clock-out',
                userId: targetUserId,
                logId: log.id
            });
        }

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

const getTimeLogs = async (req, res, next) => {
    try {
        const query = { companyId: req.user.companyId };

        if (req.query.userId) query.userId = req.query.userId;
        if (req.query.projectId) query.projectId = req.query.projectId;

        const logs = await prisma.timeLog.findMany({
            where: query,
            include: {
                userId: { select: { fullName: true, email: true, role: true } },
                projectId: { select: { name: true, location: true } },
                jobId: { select: { name: true } }
            },
            orderBy: { clockIn: 'desc' }
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            userId: l.userId || l.user || null,
            projectId: l.projectId || l.project || null,
            jobId: l.jobId || l.job || null
        })));
    } catch (error) {
        next(error);
    }
};

// Returns only the current authenticated user's open (not yet clocked-out) time log.
// Used by ClockContext so the timer/status is always tied to THIS user, not any other user.
const getActiveSelf = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const log = await prisma.timeLog.findFirst({
            where: { userId, clockOut: null },
            include: {
                projectId: { select: { name: true, location: true } },
                jobId: { select: { name: true } }
            }
        });

        if (!log) return res.json(null);

        res.json({
            ...log,
            _id: log.id,
            userId: log.userId,
            projectId: log.projectId || log.project || null,
            jobId: log.jobId || log.job || null
        });
    } catch (error) {
        next(error);
    }
};

const updateTimeLog = async (req, res, next) => {
    try {
        const log = await prisma.timeLog.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!log) {
            res.status(404);
            throw new Error('TimeLog not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        const updatedLog = await prisma.timeLog.update({
            where: { id: req.params.id },
            data,
            include: {
                user: { select: { fullName: true, email: true, role: true } },
                project: { select: { name: true } }
            }
        });

        res.json({
            ...updatedLog,
            _id: updatedLog.id,
            userId: updatedLog.user,
            projectId: updatedLog.project
        });
    } catch (error) {
        next(error);
    }
};

const deleteTimeLog = async (req, res, next) => {
    try {
        const log = await prisma.timeLog.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!log) {
            res.status(404);
            throw new Error('TimeLog not found');
        }

        await prisma.timeLog.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'TimeLog removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    clockIn,
    clockOut,
    getTimeLogs,
    getActiveSelf,
    updateTimeLog,
    deleteTimeLog
};
