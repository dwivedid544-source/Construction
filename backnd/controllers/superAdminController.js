const prisma = require('../config/prisma');

const getStats = async (req, res, next) => {
    try {
        const totalCompanies = await prisma.company.count();
        const totalUsers = await prisma.user.count();
        const totalProjects = await prisma.project.count();
        const activeSubscriptions = await prisma.company.count({
            where: { subscriptionStatus: 'active' }
        });

        const companies = await prisma.company.findMany();
        const plans = await prisma.plan.findMany();

        let monthlyRevenue = 0;
        let totalStorageUsed = 0;

        const planPriceMap = {};
        plans.forEach(p => {
            if (p.id) planPriceMap[p.id] = p.price;
            if (p.name) planPriceMap[p.name.toLowerCase()] = p.price;
        });

        planPriceMap['starter'] = 29;
        planPriceMap['business'] = 99;
        planPriceMap['enterprise'] = 499;
        planPriceMap['pro'] = 149;
        planPriceMap['basic'] = 0;

        companies.forEach(c => {
            totalStorageUsed += (c.storageUsed || 0);
            if (c.subscriptionStatus === 'active' && c.subscriptionPlanId) {
                let price = planPriceMap[c.subscriptionPlanId];
                if (price === undefined) {
                    price = planPriceMap[c.subscriptionPlanId.toLowerCase()];
                }
                if (price) {
                    monthlyRevenue += Number(price);
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
        if (user && user.role === 'COMPANY_OWNER' && user.companyId) {
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
            where: { companyId, role: 'COMPANY_OWNER' },
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
        if (user && user.role === 'COMPANY_OWNER' && user.companyId) {
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
            where: { companyId, role: 'COMPANY_OWNER' },
            data: { isActive: false }
        });

        res.json({ message: `Company ${company.name} rejected` });
    } catch (error) {
        next(error);
    }
};

const getTransactions = async (req, res, next) => {
    try {
        const { status } = req.query;
        const whereClause = {};
        if (status) whereClause.status = status;

        const owners = await prisma.user.findMany({
            where: { role: 'COMPANY_OWNER' }
        });
        const companyIdMap = {};
        owners.forEach((user, index) => {
            if (user.companyId) {
                const displayId = String(index + 1).padStart(3, '0');
                companyIdMap[user.companyId] = `COMP-${displayId}`;
            }
        });

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: { company: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(transactions.map(t => ({
            ...t,
            _id: t.id,
            companyId: t.company,
            companyDisplayId: companyIdMap[t.companyId] || 'COMP-000'
        })));
    } catch (error) {
        next(error);
    }
};

const getCompanies = async (req, res, next) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                users: {
                    where: { role: 'COMPANY_OWNER' },
                    select: { id: true, fullName: true, email: true, phone: true }
                }
            }
        });

        const mapped = companies.map((c, index) => {
            const owner = c.users[0] || null;
            return {
                ...c,
                _id: c.id,
                ownerName: owner ? owner.fullName : 'No Owner',
                ownerEmail: owner ? owner.email : 'N/A',
                ownerPhone: owner ? owner.phone : 'N/A',
                displayId: `COMP-${String(index + 1).padStart(3, '0')}`
            };
        });

        res.json(mapped);
    } catch (error) {
        next(error);
    }
};

const getSupportTickets = async (req, res, next) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            include: {
                company: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets.map(t => ({
            ...t,
            _id: t.id,
            companyId: t.company,
            createdBy: t.creator
        })));
    } catch (error) {
        next(error);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                user: { select: { fullName: true, role: true } }
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            userId: l.user
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
    getCompanies,
    getSupportTickets,
    getAuditLogs
};
