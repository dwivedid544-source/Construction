const prisma = require('../config/prisma');
const { dispatchNotification } = require('../utils/notificationHelper');

const updateProjectStats = async (projectId) => {
    // Automatic updates disabled to allow manual admin control over project progress and status
    return;
};

// GET /jobs?projectId=xxx — list jobs for a project
const getJobs = async (req, res) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const whereClause = { companyId };
        
        if (role === 'SUPER_ADMIN') {
            delete whereClause.companyId;
        }

        if (req.query.projectId) {
            whereClause.projectId = req.query.projectId;
        }

        // Role-based visibility
        if (['COMPANY_OWNER', 'PM', 'SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'FOREMAN'].includes(role)) {
            // Full company-level operational visibility for owners, admins, foremen, and project managers
            if (req.query.projectId) {
                whereClause.projectId = req.query.projectId;
            }
        } else if (['WORKER', 'SUBCONTRACTOR'].includes(role)) {
            const userTasks = await prisma.jobTask.findMany({
                where: {
                    OR: [
                        { assignedWorker: userId },
                        { createdBy: userId }
                    ]
                },
                select: { jobId: true }
            });
            
            const taskJobIds = userTasks.map(t => t.jobId).filter(Boolean);
            const specificJobs = await prisma.job.findMany({
                where: {
                    companyId,
                    OR: [
                        { foremanId: userId },
                        { assignedWorkers: userId },
                        { id: { in: taskJobIds } }
                    ]
                },
                select: { id: true }
            });

            if (specificJobs.length > 0) {
                whereClause.id = { in: specificJobs.map(j => j.id) };
            }
        } else if (role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { companyId, clientId: userId },
                select: { id: true }
            });
            const clientProjectIds = clientProjects.map(p => p.id);
            if (req.query.projectId) {
                whereClause.projectId = req.query.projectId;
            } else {
                whereClause.projectId = { in: clientProjectIds };
            }
        }

        const jobs = await prisma.job.findMany({
            where: whereClause,
            include: {
                foreman: { select: { fullName: true, role: true, avatar: true } },
                assignedWorkers: { select: { fullName: true, role: true, avatar: true } },
                project: {
                    select: {
                        name: true,
                        pmId: true,
                        pms: { select: { fullName: true, avatar: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map for frontend compatibility
        const mappedJobs = jobs.map(job => {
            const rawProj = job.project || (typeof job.projectId === 'object' ? job.projectId : null);
            const projId = rawProj ? (rawProj.id || rawProj._id) : (job.projectId ? String(job.projectId) : null);
            const projName = rawProj?.name || 'Project';
            const rawForeman = job.foreman || (typeof job.foremanId === 'object' ? job.foremanId : null);

            return {
                ...job,
                _id: String(job.id || job._id),
                id: String(job.id || job._id),
                foremanId: rawForeman || job.foremanId,
                projectId: {
                    ...(rawProj || {}),
                    _id: projId ? String(projId) : null,
                    id: projId ? String(projId) : null,
                    name: projName,
                    pmIds: rawProj?.pms || rawProj?.pmIds || []
                }
            };
        });
            
        res.json(mappedJobs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /jobs/:id
const getJobById = async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
            include: {
                foreman: { select: { fullName: true, role: true } },
                assignedWorkers: { select: { fullName: true, role: true } },
                project: {
                    select: {
                        name: true,
                        pmId: true,
                        pms: { select: { fullName: true } }
                    }
                }
            }
        });
        
        if (!job) return res.status(404).json({ message: 'Job not found' });
        
        const rawProj = job.project || (typeof job.projectId === 'object' ? job.projectId : null);
        const projId = rawProj ? (rawProj.id || rawProj._id) : (job.projectId ? String(job.projectId) : null);
        const projName = rawProj?.name || 'Project';
        const rawForeman = job.foreman || (typeof job.foremanId === 'object' ? job.foremanId : null);

        const mappedJob = {
            ...job,
            _id: String(job.id || job._id),
            id: String(job.id || job._id),
            foremanId: rawForeman || job.foremanId,
            projectId: {
                ...(rawProj || {}),
                _id: projId ? String(projId) : null,
                id: projId ? String(projId) : null,
                name: projName,
                pmIds: rawProj?.pms || rawProj?.pmIds || []
            }
        };

        res.json(mappedJob);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /jobs
const logJobActivity = async (jobId, actionType, description, userId) => {
    try {
        if (!jobId) return;
        await prisma.jobActivityLog.create({
            data: {
                jobId,
                actionType,
                type: actionType,
                description: description || '',
                details: description || '',
                createdBy: userId || null,
                userId: userId || null
            }
        });
    } catch (err) {
        console.warn('Job Activity Log Notice:', err.message);
    }
};

const createJob = async (req, res) => {
    try {
        const { equipmentIds, assignedWorkers, title, name, ...jobData } = req.body;

        const jobName = (name || title || '').trim();
        if (!jobName) {
            return res.status(400).json({ message: 'Job name is required' });
        }

        const workerIds = Array.isArray(assignedWorkers) 
            ? assignedWorkers.map(w => typeof w === 'object' ? (w.id || w._id) : w).filter(Boolean)
            : [];

        const cleanBudget = jobData.budget !== undefined && jobData.budget !== null
            ? (Number(String(jobData.budget).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0)
            : 0;

        const cleanForemanId = jobData.foremanId && jobData.foremanId !== 'null' && String(jobData.foremanId).trim() !== ''
            ? (typeof jobData.foremanId === 'object' ? (jobData.foremanId._id || jobData.foremanId.id) : jobData.foremanId)
            : null;

        const job = await prisma.job.create({
            data: {
                ...jobData,
                name: jobName,
                companyId: req.user.companyId,
                createdBy: req.user.id,
                foremanId: cleanForemanId,
                startDate: jobData.startDate ? new Date(jobData.startDate) : null,
                endDate: jobData.endDate ? new Date(jobData.endDate) : null,
                budget: cleanBudget,
                status: jobData.status || 'planning',
                location: jobData.location ? String(jobData.location).trim() : '',
                assignedWorkers: {
                    connect: workerIds.map(id => ({ id }))
                }
            },
            include: {
                foreman: { select: { fullName: true, role: true } }
            }
        });

        // Assign Equipment
        if (equipmentIds && Array.isArray(equipmentIds)) {
            await prisma.equipment.updateMany({
                where: {
                    id: { in: equipmentIds },
                    companyId: req.user.companyId
                },
                data: {
                    status: 'operational'
                }
            });
        }

        await updateProjectStats(job.projectId);

        // Sync Chat & Notifications
        try {
            const { syncProjectParticipants } = require('./chatController');
            await syncProjectParticipants(job.projectId);

            if (job.foremanId) {
                await dispatchNotification(req, {
                    userId: job.foremanId,
                    title: 'New Job Assigned',
                    message: `You have been assigned as Foreman for job: "${job.name}"`,
                    link: '/company-admin/projects',
                    type: 'project'
                });
            }

            for (const workerId of workerIds) {
                await dispatchNotification(req, {
                    userId: workerId,
                    title: 'New Job Assignment',
                    message: `You have been assigned to job: "${job.name}"`,
                    link: '/company-admin/projects',
                    type: 'project'
                });
            }
        } catch (syncError) {
            console.error('Job Create: Failed to sync chat participants/notifications:', syncError);
        }

        // Create Activity Log
        await logJobActivity(job.id, 'CREATED', `Job "${job.name}" was created.`, req.user.id);

        if (workerIds.length > 0) {
            await logJobActivity(job.id, 'WORKER_ADDED', `${workerIds.length} workers assigned at creation.`, req.user.id);
        }

        if (job.foremanId) {
            await logJobActivity(job.id, 'FOREMAN_CHANGED', `Foreman assigned during creation.`, req.user.id);
        }

        res.status(201).json({ ...job, _id: job.id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PATCH /jobs/:id
const updateJob = async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
            include: { assignedWorkers: true }
        });
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const oldStatus = job.status;
        const oldForemanId = job.foremanId;
        const oldWorkers = job.assignedWorkers.map(w => w.id);

        const updateData = {};
        const workersUpdate = {};

        if (req.user.role === 'WORKER') {
            const { status } = req.body;
            if (status) updateData.status = status;
        } else {
            Object.assign(updateData, req.body);
            delete updateData.assignedWorkers;
            delete updateData.id;
            delete updateData._id;

            if (req.body.name || req.body.title) {
                updateData.name = (req.body.name || req.body.title).trim();
            }
            if (req.body.startDate !== undefined) {
                updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
            }
            if (req.body.endDate !== undefined) {
                updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
            }
            if (req.body.budget !== undefined && req.body.budget !== null) {
                updateData.budget = Number(String(req.body.budget).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
            }
            if (req.body.location !== undefined) {
                updateData.location = req.body.location ? String(req.body.location).trim() : '';
            }
            if (req.body.assignedWorkers !== undefined) {
                const newWorkers = (Array.isArray(req.body.assignedWorkers) ? req.body.assignedWorkers : [])
                    .map(w => (typeof w === 'object' && w !== null ? (w.id || w._id) : w))
                    .filter(Boolean);
                
                workersUpdate.assignedWorkers = {
                    set: newWorkers.map(id => ({ id }))
                };

                // Log additions
                const added = newWorkers.filter(id => !oldWorkers.map(String).includes(String(id)));
                if (added.length > 0) {
                    await logJobActivity(job.id, 'WORKER_ADDED', `Added ${added.length} workers to job.`, req.user.id);
                }

                // Log removals
                const removed = oldWorkers.filter(id => !newWorkers.map(String).includes(String(id)));
                if (removed.length > 0) {
                    await logJobActivity(job.id, 'WORKER_REMOVED', `Removed ${removed.length} workers from job.`, req.user.id);
                }
            }
        }

        if (updateData.budget) updateData.budget = Number(updateData.budget);
        if (updateData.progress) updateData.progress = Number(updateData.progress);

        const updatedJob = await prisma.job.update({
            where: { id: req.params.id },
            data: {
                ...updateData,
                ...workersUpdate
            },
            include: {
                foreman: { select: { fullName: true, role: true, avatar: true } },
                assignedWorkers: { select: { fullName: true, role: true, avatar: true } }
            }
        });

        // 1. Log Status Change
        if (req.body.status && req.body.status !== oldStatus) {
            await logJobActivity(job.id, 'STATUS_CHANGED', `Status changed from ${oldStatus} to ${req.body.status}.`, req.user.id);
            if (req.body.status === 'completed') {
                await logJobActivity(job.id, 'COMPLETED', `Job marked as completed.`, req.user.id);
            }
        }

        // 2. Log Foreman Change
        if (req.body.foremanId && req.body.foremanId !== oldForemanId) {
            await logJobActivity(job.id, 'FOREMAN_CHANGED', `Foreman changed.`, req.user.id);
        }

        await updateProjectStats(updatedJob.projectId);

        // Sync Chat & Notifications
        try {
            const { syncProjectParticipants } = require('./chatController');
            await syncProjectParticipants(updatedJob.projectId);

            if (updatedJob.foremanId) {
                await dispatchNotification(req, {
                    userId: updatedJob.foremanId,
                    title: 'Job Updated',
                    message: `Assignments updated for job: "${updatedJob.name}"`,
                    link: '/company-admin/projects',
                    type: 'project'
                });
            }

            for (const worker of (updatedJob.assignedWorkers || [])) {
                await dispatchNotification(req, {
                    userId: worker.id || worker._id,
                    title: 'Job Updated',
                    message: `You are assigned to job: "${updatedJob.name}"`,
                    link: '/company-admin/projects',
                    type: 'project'
                });
            }
        } catch (syncError) {
            console.error('Job Update: Failed to sync chat/notifications:', syncError);
        }

        res.json({
            ...updatedJob,
            _id: updatedJob.id,
            foremanId: updatedJob.foreman,
            assignedWorkers: (updatedJob.assignedWorkers || []).map(w => ({
                ...w,
                _id: w.id || w._id
            }))
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE /jobs/:id
const deleteJob = async (req, res) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id }
        });
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const projectId = job.projectId;

        await prisma.$transaction([
            prisma.jobTask.deleteMany({ where: { jobId: req.params.id } }),
            prisma.timeLog.deleteMany({ where: { jobId: req.params.id } }),
            prisma.job.delete({ where: { id: req.params.id } })
        ]);

        await updateProjectStats(projectId);

        res.json({ message: 'Job deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /jobs/:id/full-history
const getJobFullHistory = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                project: { select: { name: true } },
                foreman: { select: { fullName: true } },
                assignedWorkers: { select: { fullName: true } }
            }
        });

        if (!job) return res.status(404).json({ message: 'Job not found' });

        const rawTimeLogs = await prisma.timeLog.findMany({
            where: { jobId },
            include: { user: { select: { fullName: true } } },
            orderBy: { clockIn: 'desc' }
        });

        const dailyLogs = rawTimeLogs.map(log => {
            const duration = log.clockOut ? ((new Date(log.clockOut) - new Date(log.clockIn)) / 3600000) : 0;
            return {
                workerId: log.user,
                workDate: log.clockIn,
                checkIn: log.clockIn,
                checkOut: log.clockOut,
                totalHours: duration
            };
        });

        const activityLogs = await prisma.jobActivityLog.findMany({
            where: { jobId },
            include: { user: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Javascript mapping for worker aggregation stats
        const workerStatsMap = {};
        rawTimeLogs.forEach(log => {
            const uId = log.userId;
            const durationHrs = log.clockIn && log.clockOut 
                ? ((new Date(log.clockOut) - new Date(log.clockIn)) / 3600000) 
                : 0;
            
            const dateStr = log.clockIn ? log.clockIn.toISOString().split('T')[0] : '';

            if (!workerStatsMap[uId]) {
                workerStatsMap[uId] = {
                    workerId: uId,
                    totalHours: 0,
                    daysSet: new Set()
                };
            }
            workerStatsMap[uId].totalHours += durationHrs;
            if (dateStr) {
                workerStatsMap[uId].daysSet.add(dateStr);
            }
        });

        const populatedWorkerStats = await Promise.all(Object.values(workerStatsMap).map(async (stat) => {
            const user = await prisma.user.findUnique({
                where: { id: stat.workerId },
                select: { fullName: true }
            });
            const totalDays = stat.daysSet.size;
            return {
                workerId: stat.workerId,
                workerName: user ? user.fullName : 'Unknown Employee',
                totalHours: stat.totalHours,
                totalDays,
                avgHours: totalDays > 0 ? (stat.totalHours / totalDays) : 0
            };
        }));

        // Javascript mapping for task logs sum
        const taskLogsMap = {};
        rawTimeLogs.forEach(log => {
            if (!log.taskId) return;
            const durationHrs = log.clockIn && log.clockOut 
                ? ((new Date(log.clockOut) - new Date(log.clockIn)) / 3600000) 
                : 0;
            
            if (!taskLogsMap[log.taskId]) {
                taskLogsMap[log.taskId] = 0;
            }
            taskLogsMap[log.taskId] += durationHrs;
        });

        const actualTimeLogs = await Promise.all(Object.entries(taskLogsMap).map(async ([taskId, hours]) => {
            const taskDetails = await prisma.jobTask.findUnique({
                where: { id: taskId },
                select: { title: true }
            });
            return {
                taskId,
                taskName: taskDetails ? taskDetails.title : 'Unknown Task',
                totalTaskHours: hours
            };
        }));

        res.json({
            job_details: {
                ...job,
                _id: job.id,
                projectId: job.project,
                foremanId: job.foreman
            },
            worker_summary: populatedWorkerStats,
            daily_logs: dailyLogs,
            activity_logs: activityLogs.map(a => ({ ...a, _id: a.id, createdBy: a.user })),
            task_summary: actualTimeLogs
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /jobs/:id/history-pdf
const generateJobHistoryPDF = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                project: { select: { name: true } },
                foreman: { select: { fullName: true } }
            }
        });

        if (!job) return res.status(404).json({ message: 'Job not found' });

        const rawTimeLogsPdf = await prisma.timeLog.findMany({
            where: { jobId },
            include: { user: { select: { fullName: true } } },
            orderBy: { clockIn: 'desc' }
        });

        const dailyLogs = rawTimeLogsPdf.map(log => {
            const duration = log.clockOut ? ((new Date(log.clockOut) - new Date(log.clockIn)) / 3600000) : 0;
            return {
                workerId: log.user,
                workDate: log.clockIn,
                checkIn: log.clockIn,
                checkOut: log.clockOut,
                totalHours: duration
            };
        });

        // Javascript mapping for worker aggregation stats (PDF)
        const workerStatsMap = {};
        rawTimeLogsPdf.forEach(log => {
            const uId = log.userId;
            const durationHrs = log.clockIn && log.clockOut 
                ? ((new Date(log.clockOut) - new Date(log.clockIn)) / 3600000) 
                : 0;
            
            const dateStr = log.clockIn ? log.clockIn.toISOString().split('T')[0] : '';

            if (!workerStatsMap[uId]) {
                workerStatsMap[uId] = {
                    workerId: uId,
                    totalHours: 0,
                    daysSet: new Set()
                };
            }
            workerStatsMap[uId].totalHours += durationHrs;
            if (dateStr) {
                workerStatsMap[uId].daysSet.add(dateStr);
            }
        });

        const workerStats = Object.values(workerStatsMap);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        let filename = `${job.name}_Report.pdf`;
        filename = encodeURIComponent(filename);
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        const drawHorizontalLine = (yPos) => doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, yPos).lineTo(545, yPos).stroke();

        // 1. Header Section
        doc.fillColor('#1e293b').fontSize(24).font('Helvetica-Bold').text('KAAL CONSTRUCTION', 50, 50);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('11520 84 street Nw, Edmonton,\nAlberta T5B 3B8, Canada', 50, 75);

        doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('JOB HISTORY REPORT', 320, 50, { align: 'right' });
        doc.fontSize(10).fillColor('#64748b').font('Helvetica');
        doc.text(`Reference No: ${job.id.substring(0, 8).toUpperCase()}`, { align: 'right' });
        doc.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, { align: 'right' });

        doc.moveDown(3);
        const yAfterHeader = doc.y + 10;

        // 2. Info Grid
        doc.roundedRect(50, yAfterHeader, 240, 100, 5).fill('#f8fafc').stroke('#e5e7eb');
        doc.roundedRect(305, yAfterHeader, 240, 100, 5).fill('#f8fafc').stroke('#e5e7eb');

        // Project / Job Box
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('PROJECT DETAILS', 65, yAfterHeader + 15);
        doc.fillColor('#1e293b').fontSize(11).text(job.project?.name || 'N/A', 65, yAfterHeader + 30);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Job: ${job.name}`, 65, yAfterHeader + 50);
        doc.text(`Status: ${job.status.toUpperCase()}`, 65, yAfterHeader + 65);

        // Assignment Box
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('PEOPLE INVOLVED', 320, yAfterHeader + 15);
        doc.fillColor('#1e293b').fontSize(11).text(`Foreman: ${job.foreman?.fullName || 'Unassigned'}`, 320, yAfterHeader + 30);

        doc.moveDown(3);
        let currentY = yAfterHeader + 120;

        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Worker Aggregation', 50, currentY);
        currentY += 25;

        // Table Header
        doc.fillColor('#f1f5f9').rect(50, currentY, 495, 25).fill();
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
        doc.text('WORKER NAME', 60, currentY + 8);
        doc.text('DAYS ATTENDED', 250, currentY + 8);
        doc.text('TOTAL HOURS', 450, currentY + 8, { align: 'right' });

        currentY += 30;

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        for (let i = 0; i < workerStats.length; i++) {
            const stat = workerStats[i];
            const user = await prisma.user.findUnique({
                where: { id: stat.workerId },
                select: { fullName: true }
            });

            if (i % 2 === 0) {
                doc.fillColor('#f8fafc').rect(50, currentY - 5, 495, 20).fill();
            }

            doc.fillColor('#334155');
            doc.text(user?.fullName || 'Unknown Employee', 60, currentY);
            doc.text(stat.daysSet.size.toString(), 250, currentY);
            doc.text(`${stat.totalHours.toFixed(2)} hrs`, 450, currentY, { align: 'right' });

            currentY += 20;

            if (currentY > 750) {
                doc.addPage();
                currentY = 50;
            }
        }

        currentY += 20;

        // --- Daily Logs Section ---
        if (currentY > 650) { doc.addPage(); currentY = 50; }

        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Detailed Daily Time Logs', 50, currentY);
        currentY += 25;

        dailyLogs.forEach((log) => {
            if (currentY > 780) { doc.addPage(); currentY = 50; }

            doc.fillColor('#f1f5f9').roundedRect(50, currentY, 495, 30, 4).fill();

            doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(new Date(log.workDate).toLocaleDateString(), 60, currentY + 10);
            doc.font('Helvetica').text(log.workerId?.fullName || 'Unknown', 140, currentY + 10);

            const timeStr = `${new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}`;
            doc.fillColor('#64748b').text(timeStr, 280, currentY + 10);

            doc.font('Helvetica-Bold').fillColor('#0ea5e9').text(`${log.totalHours.toFixed(2)} hrs`, 450, currentY + 10, { align: 'right' });

            currentY += 35;
        });

        currentY += 20;

        // --- Footer Note ---
        if (currentY > 720) { doc.addPage(); currentY = 50; }

        drawHorizontalLine(Math.max(currentY, 730));
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
        doc.text('Thank you for choosing KAAL Construction. This is a system-generated report.', 50, Math.max(currentY, 730) + 15, { align: 'center', width: 495 });

        doc.end();

    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get job notes
// @route   GET /api/jobs/:id/notes
// @access  Private
const getJobNotes = async (req, res) => {
    try {
        const notes = await prisma.jobNote.findMany({
            where: { jobId: req.params.id },
            include: {
                user: { select: { fullName: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const mappedNotes = notes.map(n => ({
            ...n,
            _id: n.id,
            createdBy: n.user
        }));

        res.json(mappedNotes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create job note
// @route   POST /api/jobs/:id/notes
// @access  Private
const createJobNote = async (req, res) => {
    try {
        const note = await prisma.jobNote.create({
            data: {
                jobId: req.params.id,
                note: req.body.content,
                userId: req.user.id
            }
        });
        
        const populated = await prisma.jobNote.findUnique({
            where: { id: note.id },
            include: {
                user: { select: { fullName: true, avatar: true } }
            }
        });

        res.status(201).json({
            ...populated,
            _id: populated.id,
            createdBy: populated.user
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete job note
// @route   DELETE /api/jobs/:id/notes/:noteId
// @access  Private
const deleteJobNote = async (req, res) => {
    try {
        const note = await prisma.jobNote.findUnique({
            where: { id: req.params.noteId }
        });
        if (!note) return res.status(404).json({ message: 'Note not found' });
        
        if (req.user.role !== 'COMPANY_OWNER' && note.userId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this note' });
        }

        await prisma.jobNote.delete({
            where: { id: req.params.noteId }
        });
        res.json({ message: 'Note removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getJobFullHistory,
    generateJobHistoryPDF,
    getJobNotes,
    createJobNote,
    deleteJobNote
};
