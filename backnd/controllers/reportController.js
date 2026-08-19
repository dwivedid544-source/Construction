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
        const companyId = req.user.companyId;
        const totalProjects = await prisma.project.count({ where: { companyId } });
        const totalUsers = await prisma.user.count({ where: { companyId } });
        const openIssues = await prisma.issue.count({ where: { companyId, status: 'open' } });

        res.json({
            totalProjects,
            totalUsers,
            openIssues
        });
    } catch (error) {
        next(error);
    }
};

const getSidebarMetrics = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const taskCount = await prisma.task.count({ where: { companyId, NOT: { status: 'completed' } } });
        res.json({ taskCount });
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
        res.json({ message: 'Exported' });
    } catch (error) {
        next(error);
    }
};

const getDetailedProjectReport = async (req, res, next) => {
    try {
        res.json({});
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