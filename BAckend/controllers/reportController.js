const prisma = require('../config/prisma');

// @desc    Get project overview report
// @route   GET /api/reports/project/:projectId
// @access  Private (PM, Owners)
const getProjectReport = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const project = await prisma.project.findFirst({
            where: { id: projectId, companyId: req.user.companyId }
        });
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        const totalTasks = await prisma.task.count({ where: { projectId } });
        const completedTasks = await prisma.task.count({ where: { projectId, status: 'COMPLETED' } });

        const timeLogs = await prisma.timeLog.findMany({ where: { projectId } });
        const totalHours = timeLogs.reduce((acc, log) => acc + (log.durationMinutes || 0) / 60, 0);

        const invoices = await prisma.invoice.findMany({ where: { projectId } });
        const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total || inv.amount || 0), 0);
        const totalPaid = invoices.filter(inv => inv.status === 'PAID').reduce((acc, inv) => acc + (inv.total || inv.amount || 0), 0);

        res.json({
            project: {
                name: project.name,
                status: project.status,
                progress: 0,
                budget: project.budget
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

// @desc    Get company-wide report
// @route   GET /api/reports/company
// @access  Private (Owners, Admins)
const getCompanyReport = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        const totalProjects = await prisma.project.count({ where: { companyId } });
        const activeSites = await prisma.project.count({ where: { companyId, status: 'ACTIVE' } });
        const completedProjects = await prisma.project.count({ where: { companyId, status: 'COMPLETED' } });

        const totalTasksCount = await prisma.task.count({});
        const completedTasksCount = await prisma.task.count({ where: { status: 'COMPLETED' } });

        const invoices = await prisma.invoice.findMany({ where: { companyId } });
        const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
        const totalPaid = invoices.filter(inv => inv.status === 'PAID').reduce((acc, inv) => acc + (inv.total || 0), 0);

        res.json({
            financials: {
                totalRevenue: totalPaid,
                totalInvoiced,
                outstanding: totalInvoiced - totalPaid,
                projectBudget: 0
            },
            projects: {
                total: totalProjects,
                activeSites,
                completed: completedProjects
            },
            tasks: {
                total: totalTasksCount,
                completed: completedTasksCount,
                completionRate: totalTasksCount > 0 ? ((completedTasksCount / totalTasksCount) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardStats = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        const [activeJobsCount, totalProjectsCount, totalTasksCount, totalInvoicesCount] = await Promise.all([
            prisma.project.count({ where: { companyId, status: 'ACTIVE' } }),
            prisma.project.count({ where: { companyId } }),
            prisma.task.count({}),
            prisma.invoice.count({ where: { companyId } })
        ]);

        res.json({
            metrics: {
                activeJobs: activeJobsCount,
                totalProjects: totalProjectsCount,
                totalTasks: totalTasksCount,
                totalInvoices: totalInvoicesCount
            },
            crewActivity: [],
            recentDailyLogs: [],
            trendData: []
        });
    } catch (error) {
        next(error);
    }
};

const getWorkerAttendanceReport = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

const getForemanAttendanceReport = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

const getProjectAttendanceReport = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

const exportAttendanceReport = async (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=Attendance_Report.csv');
        return res.status(200).send('Name,Role,Total Hours\n');
    } catch (error) {
        next(error);
    }
};

const getDetailedProjectReport = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const project = await prisma.project.findFirst({
            where: { id: projectId, companyId: req.user.companyId }
        });
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        const tasks = await prisma.task.findMany({ where: { projectId } });

        res.json({
            project: {
                _id: project.id,
                name: project.name,
                budget: project.budget,
                totalTasks: tasks.length
            },
            jobs: []
        });
    } catch (error) {
        next(error);
    }
};

const getSidebarMetrics = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;

        const [taskCount, notificationCount, projects] = await Promise.all([
            prisma.task.count({ where: { assignedToId: userId, status: { not: 'COMPLETED' } } }),
            prisma.notification.count({ where: { userId, read: false } }),
            prisma.project.findMany({
                where: { companyId: req.user.companyId },
                select: { id: true, name: true, status: true }
            })
        ]);

        res.json({
            taskCount,
            issueCount: 0,
            chatUnreadCount: 0,
            notificationCount,
            projects: projects.map(p => ({ ...p, _id: p.id })),
            poCount: 0
        });
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