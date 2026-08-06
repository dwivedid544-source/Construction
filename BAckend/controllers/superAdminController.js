const prisma = require('../config/prisma');

const getStats = async (req, res, next) => {
    try {
        const totalCompanies = await prisma.company.count();
        const totalUsers = await prisma.user.count();
        const totalProjects = await prisma.project.count();
        const activeSubscriptions = await prisma.company.count({ where: { subscriptionStatus: 'active' } });

        // Calculate Revenue from Companies
        const companies = await prisma.company.findMany();
        const plans = await prisma.plan.findMany(); // Fetch all plans to lookup prices

        let monthlyRevenue = 0;
        let totalStorageUsed = 0;

        // Create a map for easy plan lookup: ID -> Price AND Name -> Price (lowercase)
        const planPriceMap = {};
        plans.forEach(p => {
            if (p.id) planPriceMap[p.id.toString()] = p.price;
            if (p.name) planPriceMap[p.name.toLowerCase()] = p.price;
        });

        // Add legacy/static plan prices just in case
        planPriceMap['starter'] = 29;
        planPriceMap['business'] = 99;
        planPriceMap['enterprise'] = 499;
        planPriceMap['pro'] = 149;
        planPriceMap['basic'] = 0;

        companies.forEach(c => {
            totalStorageUsed += (c.storageUsed || 0);
            if (c.subscriptionStatus === 'active' && c.subscriptionPlanId) {
                let price = planPriceMap[c.subscriptionPlanId.toString()];
                if (price === undefined) {
                    price = planPriceMap[c.subscriptionPlanId.toString().toLowerCase()];
                }
                if (price) {
                    monthlyRevenue += price;
                }
            }
        });

        const growth = {
            companies: '+5.2%',
            subscriptions: '+3.1%',
            revenue: '+12%',
            users: '+8.4%',
            projects: '+4.5%',
            storage: '+15.2%'
        };

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const revenueData = [];

        for (let i = 11; i >= 0; i--) {
            const m = (currentMonth - i + 12) % 12;
            const baseValue = monthlyRevenue / 1000;
            const factor = 1 - (i * 0.05);
            revenueData.push({
                name: monthNames[m],
                value: Math.max(0, parseFloat((baseValue * factor).toFixed(1)))
            });
        }

        const recentSignups = await prisma.company.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, name: true, subscriptionPlanId: true, createdAt: true }
        });

        const formatStorage = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.json({
            stats: {
                totalCompanies,
                totalUsers,
                totalProjects,
                activeSubscriptions,
                monthlyRevenue: monthlyRevenue,
                storageUsage: formatStorage(totalStorageUsed),
                rawStorageUsage: totalStorageUsed,
                expiringTrials: 5
            },
            growth,
            revenueData,
            recentSignups: recentSignups.map(s => ({ ...s, _id: s.id }))
        });
    } catch (error) {
        next(error);
    }
};

const approveCompany = async (req, res, next) => {
    try {
        let companyId = req.params.id;
        
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (user && user.role === 'COMPANY_OWNER') {
            companyId = user.companyId;
        }

        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        await prisma.company.update({
            where: { id: companyId },
            data: { subscriptionStatus: 'active' }
        });

        await prisma.user.updateMany({
            where: { companyId: company.id, role: 'COMPANY_OWNER' },
            data: { isActive: true }
        });

        res.json({ message: `Company ${company.name} approved and activated` });
    } catch (error) {
        next(error);
    }
};

const rejectCompany = async (req, res, next) => {
    try {
        let companyId = req.params.id;
        
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (user && user.role === 'COMPANY_OWNER') {
            companyId = user.companyId;
        }

        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        await prisma.company.update({
            where: { id: companyId },
            data: { subscriptionStatus: 'canceled' }
        });

        await prisma.user.updateMany({
            where: { companyId: company.id, role: 'COMPANY_OWNER' },
            data: { isActive: false }
        });

        res.json({ message: `Company ${company.name} rejected` });
    } catch (error) {
        next(error);
    }
};

// @desc    Get billing transactions and failures (Mixed with Company Subscriptions)
// @route   GET /api/super-admin/billing/transactions
// @access  Private (Super Admin)
const getTransactions = async (req, res, next) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = {};
        if (status) query.status = status;

        const owners = await prisma.user.findMany({ where: { role: 'COMPANY_OWNER' } });
        const companyIdMap = {};
        owners.forEach((user, index) => {
            if (user.companyId) {
                const displayId = String(index + 1).padStart(3, '0');
                companyIdMap[user.companyId.toString()] = `COMP-${displayId}`;
            }
        });

        const realTransactionsDocs = await prisma.transaction.findMany({
            where: query,
            include: { company: { select: { id: true, name: true } } }
        });

        const realTransactions = realTransactionsDocs.map(t => ({
            ...t,
            _id: t.id,
            companyId: t.company ? { _id: t.company.id, name: t.company.name } : null,
            displayCompanyId: t.company ? companyIdMap[t.company.id] || 'N/A' : 'N/A'
        }));

        let virtualTransactions = [];
        if (!status || status === 'paid') {
            const companies = await prisma.company.findMany({ where: { subscriptionStatus: 'active' } });
            const plans = await prisma.plan.findMany();

            const planPriceMap = {};
            plans.forEach(p => {
                if (p.id) planPriceMap[p.id.toString()] = p.price;
                if (p.name) planPriceMap[p.name.toLowerCase()] = p.price;
            });
            planPriceMap['starter'] = 29; planPriceMap['business'] = 99;
            planPriceMap['enterprise'] = 499; planPriceMap['pro'] = 149; planPriceMap['basic'] = 0;

            virtualTransactions = companies.map(c => {
                let price = 0;
                if (c.subscriptionPlanId) {
                    price = planPriceMap[c.subscriptionPlanId.toString()] || planPriceMap[c.subscriptionPlanId.toString().toLowerCase()] || 0;
                }

                if (price === 0) return null;

                return {
                    _id: c.id,
                    companyId: {
                        _id: c.id,
                        name: c.name
                    },
                    displayCompanyId: companyIdMap[c.id] || 'N/A',
                    amount: price,
                    status: 'paid',
                    date: c.createdAt,
                    createdAt: c.createdAt,
                    invoiceId: 'SUB-' + c.id.substring(0, 8),
                    paymentMethod: 'Subscription',
                    isVirtual: true
                };
            }).filter(Boolean);
        }

        const allTransactions = [...realTransactions, ...virtualTransactions].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const limitedTransactions = allTransactions.slice(0, parseInt(limit));

        res.json(limitedTransactions);
    } catch (error) {
        next(error);
    }
};

// @desc    Get detailed billing stats for Revenue page
// @route   GET /api/super-admin/billing/stats
// @access  Private (Super Admin)
const getBillingStats = async (req, res, next) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const revenueYTDResult = await prisma.transaction.aggregate({
            where: {
                status: 'paid',
                createdAt: { gte: startOfYear }
            },
            _sum: { amount: true }
        });
        let netRevenueYTD = revenueYTDResult._sum.amount || 0;
        let yearlyRevenue = netRevenueYTD;

        const refundsResult = await prisma.transaction.aggregate({
            where: {
                status: 'refunded',
                createdAt: { gte: startOfYear }
            },
            _sum: { amount: true }
        });
        const totalRefunds = refundsResult._sum.amount || 0;

        const pendingResult = await prisma.transaction.aggregate({
            where: { status: 'pending' },
            _sum: { amount: true }
        });
        const pendingInvoices = pendingResult._sum.amount || 0;

        const companies = await prisma.company.findMany({ where: { subscriptionStatus: 'active' } });
        const plans = await prisma.plan.findMany();

        const planPriceMap = {};
        plans.forEach(p => {
            if (p.id) planPriceMap[p.id.toString()] = p.price;
            if (p.name) planPriceMap[p.name.toLowerCase()] = p.price;
        });
        planPriceMap['starter'] = 29; planPriceMap['business'] = 99;
        planPriceMap['enterprise'] = 499; planPriceMap['pro'] = 149; planPriceMap['basic'] = 0;

        let currentMRR = 0;
        companies.forEach(c => {
            if (c.subscriptionPlanId) {
                let price = planPriceMap[c.subscriptionPlanId.toString()] || planPriceMap[c.subscriptionPlanId.toString().toLowerCase()];
                if (price) currentMRR += price;
            }
        });

        const monthlyRevenueTrend = [];
        for (let i = 11; i >= 0; i--) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            let monthMRR = 0;
            companies.forEach(c => {
                const created = new Date(c.createdAt);
                if (created < nextMonth) {
                    if (c.subscriptionPlanId) {
                        let price = planPriceMap[c.subscriptionPlanId.toString()] || planPriceMap[c.subscriptionPlanId.toString().toLowerCase()];
                        if (price) monthMRR += price;
                    }
                }
            });
            monthlyRevenueTrend.push(monthMRR);
        }

        const yearlyRevenueTrend = [];
        const years = [currentYear - 2, currentYear - 1, currentYear];

        for (const year of years) {
            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);
            const yearStats = await prisma.transaction.aggregate({
                where: { status: 'paid', createdAt: { gte: start, lt: end } },
                _sum: { amount: true }
            });

            yearlyRevenueTrend.push({
                year,
                total: yearStats._sum.amount || 0
            });
        }

        res.json({
            netRevenueYTD,
            yearlyRevenue,
            totalRefunds,
            pendingInvoices,
            currentMRR,
            growthTrend: '+12% vs last year',
            monthlyRevenueTrend,
            yearlyRevenueTrend
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get support tickets
// @route   GET /api/super-admin/support/tickets
// @access  Private (Super Admin)
const getSupportTickets = async (req, res, next) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            include: {
                company: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(tickets.map(t => ({
            ...t,
            _id: t.id,
            companyId: t.company ? { _id: t.company.id, name: t.company.name } : null,
            userId: t.user ? { _id: t.user.id, fullName: t.user.name, email: t.user.email } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Update support ticket status or add reply
// @route   PATCH /api/super-admin/support/tickets/:id
// @access  Private (Super Admin)
const updateSupportTicket = async (req, res, next) => {
    try {
        const { status } = req.body;
        const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });

        if (!ticket) {
            res.status(404);
            throw new Error('Ticket not found');
        }

        const updateData = {};
        if (status) updateData.status = status;

        const updatedTicket = await prisma.supportTicket.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ ...updatedTicket, _id: updatedTicket.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users across all platforms
// @route   GET /api/super-admin/users
// @access  Private (Super Admin)
const getGlobalUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            include: { company: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(users.map(u => {
            const userObj = { ...u, _id: u.id, fullName: u.name, companyId: u.company ? { _id: u.company.id, name: u.company.name } : null };
            delete userObj.password;
            return userObj;
        }));
    } catch (error) {
        next(error);
    }
};

// @desc    Get system audit logs
// @route   GET /api/super-admin/logs
// @access  Private (Super Admin)
const getSystemLogs = async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            userId: l.user ? { _id: l.user.id, fullName: l.user.name, email: l.user.email } : null
        })));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStats,
    approveCompany,
    rejectCompany,
    getTransactions,
    getBillingStats,
    getSupportTickets,
    updateSupportTicket,
    getGlobalUsers,
    getSystemLogs
};
