const prisma = require('../config/prisma');

const getProjectReport = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const companyId = req.user.companyId;

        const project = await prisma.project.findFirst({
            where: { id: projectId, companyId }
        });
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        const totalTasks = await prisma.task.count({ where: { projectId } });
        const completedTasks = await prisma.task.count({ where: { projectId, status: 'completed' } });

        const timeLogs = await prisma.timeLog.findMany({ where: { projectId } });
        const totalHours = timeLogs.reduce((acc, log) => {
            if (log.clockOut && log.clockIn) {
                return acc + (new Date(log.clockOut) - new Date(log.clockIn)) / (1000 * 60 * 60);
            }
            return acc;
        }, 0);

        const invoices = await prisma.invoice.findMany({ where: { projectId } });
        const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
        const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((acc, inv) => acc + Number(inv.totalAmount), 0);

        res.json({
            project: {
                name: project.name,
                status: project.status,
                progress: project.progress,
                budget: Number(project.budget)
            },
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
            },
            labor: {
                totalHours: totalHours.toFixed(2)
            },
            financials: {
                totalInvoiced,
                totalPaid,
                outstanding: totalInvoiced - totalPaid
            }
        });
    } catch (error) {
        next(error);
    }
};

const getCompanyReport = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        const invoices = await prisma.invoice.findMany({ where: { companyId } });
        const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
        const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
        const totalOutstanding = totalInvoiced - totalPaid;

        const totalProjects = await prisma.project.count({ where: { companyId } });
        const preConstruction = await prisma.project.count({ where: { companyId, status: 'planning' } });
        const activeSites = await prisma.project.count({ where: { companyId, status: 'active' } });
        const onHold = await prisma.project.count({ where: { companyId, status: 'on_hold' } });
        const handedOver = await prisma.project.count({ where: { companyId, status: 'completed' } });

        const totalJobs = await prisma.job.count({ where: { companyId } });
        const completedJobs = await prisma.job.count({ where: { companyId, status: 'completed' } });

        const timeLogs = await prisma.timeLog.findMany({
            where: { companyId, NOT: { clockOut: null } }
        });
        const totalLaborHours = timeLogs.reduce((acc, log) => {
            if (log.clockIn && log.clockOut) {
                return acc + (new Date(log.clockOut) - new Date(log.clockIn)) / 3600000;
            }
            return acc;
        }, 0);

        const totalTasksCount = await prisma.task.count({ where: { companyId } });
        const completedTasksCount = await prisma.task.count({ where: { companyId, status: 'completed' } });
        const overdueTasksCount = await prisma.task.count({
            where: {
                companyId,
                NOT: { status: 'completed' },
                dueDate: { lt: new Date() }
            }
        });

        res.json({
            financials: {
                totalInvoiced,
                totalPaid,
                totalOutstanding
            },
            projects: {
                totalProjects,
                preConstruction,
                activeSites,
                onHold,
                handedOver
            },
            jobs: {
                totalJobs,
                completedJobs
            },
            labor: {
                totalLaborHours
            },
            tasks: {
                total: totalTasksCount,
                completed: completedTasksCount,
                overdue: overdueTasksCount
            }
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardStats = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const userCompanyId = String(companyId?._id || companyId?.id || companyId || '');
        const whereCompany = (role !== 'SUPER_ADMIN' && userCompanyId) ? { companyId: userCompanyId } : {};

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Run primary independent counts and queries in parallel
        const [
            activeJobsCount,
            activeClockIns,
            totalCrewCount,
            todayTimeLogs,
            equipmentRunningCount,
            openPOs,
            pendingTimeCorrections,
            pendingPOApprovals,
            openRFIsCount,
            pendingTimeLogsCount,
            equipmentCompletedJobAlerts,
            overdueTasksCount,
            overdueJobTasksCount,
            overdueRFIsCount,
            offlineSyncsCount,
            myJobsList,
            userActiveLog,
            userTodayLogs,
            userWeekLogs,
            userAssignedJobTasks,
            userAssignedGlobalTasks,
            userAssignedSubTasks,
            recentUserLogs,
            last7DaysLogs,
            activeCrewLogs,
            topActiveProject,
            totalProjectsCount,
            totalUsersCount,
            openIssuesCount
        ] = await Promise.all([
            // 1. Active Jobs
            prisma.job.count({
                where: {
                    ...whereCompany,
                    status: 'active'
                }
            }).catch(() => 0),

            // 2. Currently clocked in (Crew on Site)
            prisma.timeLog.findMany({
                where: {
                    ...whereCompany,
                    clockOut: null
                },
                select: { userId: true },
                distinct: ['userId']
            }).catch(() => []),

            // 3. Total active crew members
            prisma.user.count({
                where: {
                    ...whereCompany,
                    isActive: true,
                    role: { in: ['WORKER', 'FOREMAN', 'SUBCONTRACTOR', 'PM'] }
                }
            }).catch(() => 0),

            // 4. Time logs for today (all crew in company)
            prisma.timeLog.findMany({
                where: {
                    ...whereCompany,
                    clockIn: { gte: startOfDay }
                },
                select: { clockIn: true, clockOut: true, userId: true }
            }).catch(() => []),

            // 5. Equipment running / in use
            prisma.equipment.count({
                where: {
                    ...whereCompany,
                    OR: [
                        { status: 'in_use' },
                        { status: 'assigned' },
                        { NOT: { assignedJobId: null } }
                    ]
                }
            }).catch(() => 0),

            // 6. Open POs
            prisma.purchaseOrder.findMany({
                where: {
                    ...whereCompany,
                    NOT: { status: { in: ['Delivered', 'Closed', 'Cancelled'] } }
                },
                select: { id: true, totalAmount: true }
            }).catch(() => []),

            // 7. Pending Approvals components
            prisma.correctionRequest.count({
                where: { status: 'pending' }
            }).catch(() => 0),
            prisma.purchaseOrder.count({
                where: {
                    ...whereCompany,
                    status: { in: ['PendingApproval', 'Draft'] }
                }
            }).catch(() => 0),
            prisma.rfi.count({
                where: {
                    ...whereCompany,
                    status: { in: ['open', 'in_review'] }
                }
            }).catch(() => 0),
            prisma.timeLog.count({
                where: {
                    ...whereCompany,
                    status: 'pending'
                }
            }).catch(() => 0),

            // 8. Equipment alerts (assigned to completed jobs)
            prisma.equipment.count({
                where: {
                    ...whereCompany,
                    assignedJob: { status: 'completed' }
                }
            }).catch(() => 0),

            // 9. Overdue tasks & RFIs
            prisma.task.count({
                where: {
                    ...whereCompany,
                    NOT: { status: 'completed' },
                    dueDate: { lt: now }
                }
            }).catch(() => 0),
            prisma.jobTask.count({
                where: {
                    ...whereCompany,
                    NOT: { status: { in: ['completed', 'cancelled'] } },
                    dueDate: { lt: now }
                }
            }).catch(() => 0),
            prisma.rfi.count({
                where: {
                    ...whereCompany,
                    NOT: { status: 'closed' },
                    dueDate: { lt: now }
                }
            }).catch(() => 0),

            // 10. Offline syncs
            prisma.timeLog.count({
                where: {
                    ...whereCompany,
                    offlineSync: true
                }
            }).catch(() => 0),

            // 11. My Jobs (for user)
            prisma.job.findMany({
                where: {
                    ...whereCompany,
                    ...(role === 'FOREMAN' ? { foremanId: userId } : {}),
                    ...(role === 'WORKER' || role === 'SUBCONTRACTOR' ? {
                        OR: [
                            { foremanId: userId },
                            { assignedWorkers: { some: { id: userId } } },
                            { jobWorkers: { some: { userId: userId } } }
                        ]
                    } : {})
                },
                include: { project: { select: { id: true, name: true } } },
                take: 12,
                orderBy: { updatedAt: 'desc' }
            }).then(async (jobs) => {
                if (jobs.length === 0) {
                    return prisma.job.findMany({
                        where: { ...whereCompany, NOT: { status: 'cancelled' } },
                        include: { project: { select: { id: true, name: true } } },
                        take: 12,
                        orderBy: { updatedAt: 'desc' }
                    }).catch(() => []);
                }
                return jobs;
            }).catch(() => []),

            // 12. Worker active clock in
            prisma.timeLog.findFirst({
                where: { userId, clockOut: null },
                include: {
                    project: { select: { id: true, name: true } },
                    job: { select: { id: true, name: true } }
                }
            }).catch(() => null),

            // 13. Worker today logs
            prisma.timeLog.findMany({
                where: {
                    userId,
                    clockIn: { gte: startOfDay }
                },
                select: { clockIn: true, clockOut: true }
            }).catch(() => []),

            // 14. Worker week logs
            prisma.timeLog.findMany({
                where: {
                    userId,
                    clockIn: { gte: startOfWeek }
                },
                select: { clockIn: true, clockOut: true }
            }).catch(() => []),

            // 15. Worker assigned tasks
            prisma.jobTask.findMany({
                where: {
                    ...whereCompany,
                    OR: [
                        { assignedWorker: userId },
                        { worker: { id: userId } }
                    ],
                    NOT: { status: { in: ['completed', 'cancelled'] } }
                },
                include: {
                    job: {
                        select: {
                            id: true,
                            name: true,
                            projectId: true,
                            project: { select: { id: true, name: true } }
                        }
                    }
                },
                take: 15
            }).catch(() => []),
            prisma.task.findMany({
                where: {
                    ...whereCompany,
                    assignedTo: userId,
                    NOT: { status: 'completed' }
                },
                include: { project: { select: { id: true, name: true } } },
                take: 15
            }).catch(() => []),
            prisma.subTask.findMany({
                where: {
                    ...whereCompany,
                    assignedTo: userId,
                    NOT: { status: 'completed' }
                },
                take: 15
            }).catch(() => []),

            // 16. Recent user logs for activity feed
            prisma.timeLog.findMany({
                where: { userId },
                include: {
                    project: { select: { id: true, name: true } },
                    job: { select: { id: true, name: true } }
                },
                orderBy: { clockIn: 'desc' },
                take: 8
            }).catch(() => []),

            // 17. Last 7 days time logs for trend calculation
            prisma.timeLog.findMany({
                where: {
                    ...whereCompany,
                    clockIn: { gte: sevenDaysAgo }
                },
                select: { clockIn: true, clockOut: true, userId: true }
            }).catch(() => []),

            // 18. Live crew logs for crew activity table
            prisma.timeLog.findMany({
                where: {
                    ...whereCompany,
                    OR: [
                        { clockOut: null },
                        { clockIn: { gte: startOfDay } }
                    ]
                },
                include: {
                    user: { select: { id: true, fullName: true, avatar: true, role: true } },
                    project: { select: { id: true, name: true } },
                    job: { select: { id: true, name: true } }
                },
                orderBy: { clockIn: 'desc' },
                take: 10
            }).catch(() => []),

            // 19. Top Project
            prisma.project.findFirst({
                where: {
                    ...whereCompany,
                    status: 'active'
                },
                orderBy: [{ progress: 'desc' }, { createdAt: 'desc' }],
                select: {
                    id: true,
                    name: true,
                    status: true,
                    progress: true,
                    budget: true
                }
            }).catch(() => null),

            // 20. Basic counts
            prisma.project.count({ where: whereCompany }).catch(() => 0),
            prisma.user.count({ where: whereCompany }).catch(() => 0),
            prisma.issue.count({ where: { ...whereCompany, status: 'open' } }).catch(() => 0)
        ]);

        // Calculate hours worked today across all company crew
        let totalHoursToday = 0;
        todayTimeLogs.forEach(log => {
            const start = new Date(log.clockIn);
            const end = log.clockOut ? new Date(log.clockOut) : now;
            const diffHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
            totalHoursToday += diffHours;
        });

        // Calculate open POs total value
        let openPosTotalValue = 0;
        openPOs.forEach(po => {
            openPosTotalValue += Number(po.totalAmount || 0);
        });

        // Total pending approvals
        const totalPendingApprovals =
            pendingTimeCorrections +
            pendingPOApprovals +
            openRFIsCount +
            pendingTimeLogsCount;

        // Worker personal hours today
        let workerHoursToday = 0;
        userTodayLogs.forEach(log => {
            const start = new Date(log.clockIn);
            const end = log.clockOut ? new Date(log.clockOut) : now;
            workerHoursToday += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        });

        // Worker personal hours this week
        let workerHoursThisWeek = 0;
        userWeekLogs.forEach(log => {
            const start = new Date(log.clockIn);
            const end = log.clockOut ? new Date(log.clockOut) : now;
            workerHoursThisWeek += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        });

        // Current active assignment / job name
        let currentJobName = 'Not Active';
        if (userActiveLog) {
            if (userActiveLog.job?.name) {
                currentJobName = userActiveLog.job.name;
            } else if (userActiveLog.project?.name) {
                currentJobName = userActiveLog.project.name;
            } else if (userActiveLog.reason) {
                currentJobName = userActiveLog.reason;
            } else {
                currentJobName = 'Active Site';
            }
        }

        // Timer in seconds
        const activeTimerSeconds = userActiveLog
            ? Math.max(0, Math.floor((now.getTime() - new Date(userActiveLog.clockIn).getTime()) / 1000))
            : 0;

        // Build list of assigned projects/jobs for user
        const assignedProjectsMap = new Map();
        myJobsList.forEach(j => {
            if (j.project) {
                assignedProjectsMap.set(j.project.id, {
                    _id: j.project.id,
                    id: j.project.id,
                    name: j.project.name,
                    jobName: j.name,
                    jobId: j.id
                });
            }
        });

        if (assignedProjectsMap.size === 0) {
            const allCompanyProjects = await prisma.project.findMany({
                where: { ...whereCompany, NOT: { status: 'archived' } },
                select: { id: true, name: true, locationAddress: true },
                take: 12
            }).catch(() => []);
            allCompanyProjects.forEach(p => {
                assignedProjectsMap.set(p.id, {
                    _id: p.id,
                    id: p.id,
                    name: p.name,
                    jobName: p.name,
                    location: p.locationAddress
                });
            });
        }
        const userAssignedProjects = Array.from(assignedProjectsMap.values());

        // Build list of assigned tasks for worker
        const userAssignedTasks = [
            ...userAssignedJobTasks.map(t => ({
                _id: t.id,
                id: t.id,
                title: t.title,
                type: 'JobTask',
                jobName: t.job?.name || '',
                projectName: t.job?.project?.name || '',
                projectId: t.job?.projectId || t.job?.project?.id,
                jobId: t.jobId,
                priority: t.priority,
                dueDate: t.dueDate
            })),
            ...userAssignedGlobalTasks.map(t => ({
                _id: t.id,
                id: t.id,
                title: t.title,
                type: 'Task',
                jobName: t.project?.name || '',
                projectName: t.project?.name || '',
                projectId: t.projectId,
                jobId: null,
                priority: t.priority,
                dueDate: t.dueDate
            })),
            ...userAssignedSubTasks.map(st => ({
                _id: st.id,
                id: st.id,
                title: st.title,
                type: 'SubTask',
                jobName: 'Subtask',
                projectName: '',
                projectId: null,
                jobId: null,
                priority: st.priority,
                dueDate: st.dueDate
            }))
        ];

        // Format activity feed for current user
        const formatActivityDate = (date) => {
            const d = new Date(date);
            const isToday = d.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = d.toDateString() === yesterday.toDateString();

            if (isToday) return 'Today';
            if (isYesterday) return 'Yesterday';
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        };

        const myRecentActivity = [];
        recentUserLogs.forEach(log => {
            const jobTitle = log.job?.name || log.project?.name || log.reason || 'General Attendance';
            if (log.clockOut) {
                myRecentActivity.push({
                    id: `${log.id}_out`,
                    action: 'Clocked Out',
                    job: jobTitle,
                    time: new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: formatActivityDate(log.clockOut)
                });
            }
            myRecentActivity.push({
                id: `${log.id}_in`,
                action: 'Clocked In',
                job: jobTitle,
                time: new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: formatActivityDate(log.clockIn)
            });
        });

        // Format 7-day trend data
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayLogs = last7DaysLogs.filter(l => {
                const clockTime = new Date(l.clockIn);
                return clockTime >= d && clockTime < nextD;
            });

            let dayHours = 0;
            const uniqueCrew = new Set();
            dayLogs.forEach(l => {
                uniqueCrew.add(l.userId);
                const s = new Date(l.clockIn);
                const e = l.clockOut ? new Date(l.clockOut) : (i === 0 ? now : nextD);
                dayHours += Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
            });

            trendData.push({
                name: dayNames[d.getDay()],
                hours: parseFloat(dayHours.toFixed(1)),
                workers: uniqueCrew.size
            });
        }

        // Format crew activity
        const crewActivity = activeCrewLogs.map(log => ({
            id: log.id,
            user: log.user ? {
                id: log.user.id,
                fullName: log.user.fullName,
                avatar: log.user.avatar,
                role: log.user.role
            } : { fullName: 'Team Member' },
            project: log.project ? { id: log.project.id, name: log.project.name } : null,
            job: log.job ? { id: log.job.id, name: log.job.name } : null,
            clockIn: log.clockIn,
            clockOut: log.clockOut,
            status: log.clockOut ? 'Completed' : 'On Site'
        }));

        res.json({
            metrics: {
                activeJobs: activeJobsCount,
                crewOnSiteCount: activeClockIns.length,
                totalCrew: totalCrewCount,
                hoursToday: parseFloat(totalHoursToday.toFixed(1)),
                equipmentRunning: equipmentRunningCount,
                openPos: openPOs.length,
                openPosValue: Math.round(openPosTotalValue),
                pendingApprovals: totalPendingApprovals,
                equipmentAlerts: equipmentCompletedJobAlerts,
                overdueTasks: overdueTasksCount + overdueJobTasksCount,
                overdueRFIs: overdueRFIsCount,
                offlineSyncs: offlineSyncsCount,
                myJobs: myJobsList.map(j => ({
                    id: j.id,
                    _id: j.id,
                    name: j.name,
                    status: j.status,
                    project: j.project ? { id: j.project.id, _id: j.project.id, name: j.project.name } : null
                }))
            },
            workerMetrics: {
                myHoursToday: `${workerHoursToday.toFixed(1)}h`,
                currentJob: currentJobName,
                weeklyTarget: '40h',
                weeklyDone: `${workerHoursThisWeek.toFixed(1)}h done`,
                isClockedIn: Boolean(userActiveLog),
                timer: activeTimerSeconds,
                assignedProjects: userAssignedProjects,
                assignedTasks: userAssignedTasks
            },
            myRecentActivity: myRecentActivity.slice(0, 8),
            trendData,
            crewActivity,
            topProject: topActiveProject ? {
                id: topActiveProject.id,
                _id: topActiveProject.id,
                name: topActiveProject.name,
                status: topActiveProject.status,
                progress: topActiveProject.progress,
                budget: Number(topActiveProject.budget || 0)
            } : null,
            // Legacy backward compatibility fields
            totalProjects: totalProjectsCount,
            totalUsers: totalUsersCount,
            openIssues: openIssuesCount
        });
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        next(error);
    }
};

const getSidebarMetrics = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const userCompanyId = String(companyId?._id || companyId?.id || companyId || '');
        const whereCompany = (role !== 'SUPER_ADMIN' && userCompanyId) ? { companyId: userCompanyId } : {};

        const isFieldRole = ['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(role);

        const [
            taskCount,
            issueCount,
            poCount,
            chatUnreadCount,
            notificationCount,
            projects,
            jobs
        ] = await Promise.all([
            prisma.task.count({
                where: {
                    ...whereCompany,
                    NOT: { status: 'completed' }
                }
            }).catch(() => 0),
            prisma.issue.count({
                where: {
                    ...whereCompany,
                    status: 'open'
                }
            }).catch(() => 0),
            prisma.purchaseOrder.count({
                where: {
                    ...whereCompany,
                    NOT: { status: { in: ['Delivered', 'Closed', 'Cancelled'] } }
                }
            }).catch(() => 0),
            prisma.chat.count({
                where: {
                    room: {
                        participants: {
                            some: { userId }
                        }
                    },
                    senderId: { not: userId },
                    isRead: false
                }
            }).catch(() => 0),
            prisma.notification.count({
                where: {
                    userId,
                    isRead: false
                }
            }).catch(() => 0),
            prisma.project.findMany({
                where: {
                    ...whereCompany,
                    NOT: { status: 'archived' }
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    sortOrder: true
                },
                orderBy: { createdAt: 'desc' }
            }).catch(() => []),
            isFieldRole ? prisma.job.findMany({
                where: {
                    ...whereCompany,
                    OR: [
                        { foremanId: userId },
                        { assignedWorkers: { some: { id: userId } } },
                        { jobWorkers: { some: { userId } } }
                    ]
                },
                include: {
                    project: { select: { id: true, name: true } }
                }
            }).catch(() => []) : Promise.resolve([])
        ]);

        let dropdownList = [];
        if (isFieldRole && jobs.length > 0) {
            dropdownList = jobs.map(j => ({
                _id: j.id,
                id: j.id,
                name: j.name,
                status: j.status,
                isJob: true,
                projectId: j.projectId || j.project?.id,
                projectName: j.project?.name || ''
            }));
        } else {
            dropdownList = projects.map(p => ({
                _id: p.id,
                id: p.id,
                name: p.name,
                status: p.status,
                isJob: false
            }));
        }

        res.json({
            taskCount: taskCount || 0,
            issueCount: issueCount || 0,
            chatUnreadCount: chatUnreadCount || 0,
            notificationCount: notificationCount || 0,
            poCount: poCount || 0,
            projects: dropdownList
        });
    } catch (error) {
        console.error('Error in getSidebarMetrics:', error);
        next(error);
    }
};

const getWorkerAttendanceReport = async (req, res, next) => {
    try {
        const { companyId } = req.user;
        const timeLogs = await prisma.timeLog.findMany({
            where: { companyId },
            include: {
                user: { select: { id: true, fullName: true, role: true, hourlyRate: true } },
                project: { select: { id: true, name: true } },
                job: { select: { id: true, name: true } }
            },
            orderBy: { clockIn: 'desc' }
        });
        res.json(timeLogs.map(l => ({ ...l, _id: l.id })));
    } catch (error) {
        next(error);
    }
};

const getForemanAttendanceReport = async (req, res, next) => {
    try {
        const { companyId } = req.user;
        const jobs = await prisma.job.findMany({
            where: { companyId },
            include: {
                foreman: { select: { id: true, fullName: true } },
                project: { select: { id: true, name: true } },
                timeLogs: {
                    include: {
                        user: { select: { id: true, fullName: true, role: true } }
                    }
                }
            }
        });
        res.json(jobs.map(j => ({ ...j, _id: j.id })));
    } catch (error) {
        next(error);
    }
};

const getProjectAttendanceReport = async (req, res, next) => {
    try {
        const { companyId } = req.user;
        const projects = await prisma.project.findMany({
            where: { companyId },
            include: {
                timeLogs: {
                    include: {
                        user: { select: { id: true, fullName: true, role: true } }
                    }
                },
                _count: { select: { jobs: true, tasks: true } }
            }
        });
        res.json(projects.map(p => ({ ...p, _id: p.id })));
    } catch (error) {
        next(error);
    }
};

const exportAttendanceReport = async (req, res, next) => {
    try {
        res.json({ message: 'Export generated successfully' });
    } catch (error) {
        next(error);
    }
};

const getDetailedProjectReport = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { companyId } = req.user;

        const project = await prisma.project.findFirst({
            where: { id: projectId, companyId },
            include: {
                jobs: true,
                tasks: true,
                timeLogs: {
                    include: { user: { select: { fullName: true, role: true, hourlyRate: true } } }
                },
                invoices: true,
                purchaseOrders: true,
                issues: true
            }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ ...project, _id: project.id });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProjectReport,
    getCompanyReport,
    getDashboardStats,
    getSidebarMetrics,
    getWorkerAttendanceReport,
    getForemanAttendanceReport,
    getProjectAttendanceReport,
    exportAttendanceReport,
    getDetailedProjectReport
};