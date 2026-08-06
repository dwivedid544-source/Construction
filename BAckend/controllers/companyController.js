const { companyRepository, userRepository } = require('../repositories');
const prisma = require('../config/prisma');

// @desc    Get dashboard statistics for a company
// @route   GET /api/companies/dashboard/stats
// @access  Private (Company Admin/Owner)
const getDashboardStats = async (req, res, next) => {
    try {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const companyId = req.user.companyId;
        const userId = req.user._id || req.user.id;
        const role = req.user.role;

        const isStaff = ['WORKER', 'FOREMAN'].includes(role);

        // Define filters based on role
        const taskFilter = { companyId };
        const projectFilter = { companyId, status: 'active' };
        const issueFilter = { companyId, status: 'open' };

        const photoFilter = { companyId };
        if (role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { companyId, clientId: userId },
                select: { id: true }
            });
            const clientProjectIds = clientProjects.map(p => p.id);
            photoFilter.projectId = { in: clientProjectIds };
            projectFilter.id = { in: clientProjectIds };
        } else if (isStaff) {
            taskFilter.assignedToId = userId;
            const staffTasks = await prisma.task.findMany({
                where: { assignedToId: userId },
                select: { projectId: true }
            });
            const projectIds = staffTasks.map(t => t.projectId).filter(Boolean);
            projectFilter.id = { in: projectIds };
            photoFilter.projectId = projectFilter.id;
        }

        // Parallel counts for cards
        const [
            todayTasks,
            overdueTasks,
            activeProjects,
            openIssues,
            pendingInvoicesCount,
            totalPhotosToday,
            onSiteEmployees
        ] = await Promise.all([
            prisma.task.count({ where: { ...taskFilter, dueDate: { gte: startOfToday, lte: endOfToday } } }),
            prisma.task.count({ where: { ...taskFilter, status: { not: 'completed' }, dueDate: { lt: startOfToday } } }),
            prisma.project.count({ where: projectFilter }),
            prisma.issue.count({ where: issueFilter }),
            prisma.invoice.count({ where: { companyId, status: { in: ['unpaid', 'partially_paid', 'overdue'] } } }),
            prisma.photo.count({ where: { ...photoFilter, createdAt: { gte: startOfToday } } }),
            prisma.timeLog.count({ where: { companyId, clockOut: null } })
        ]);

        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                status: { in: ['unpaid', 'partially_paid', 'overdue'] }
            }
        });
        const outstandingAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || inv.totalAmount || 0), 0);

        const activeProjectsList = await prisma.project.findMany({
            where: projectFilter,
            take: 5
        });

        const barData = await Promise.all(activeProjectsList.map(async (p) => {
            const pos = await prisma.purchaseOrder.findMany({ where: { projectId: p.id, status: 'received' } });
            const spent = pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

            return {
                name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                progress: p.progress || 0,
                budget: p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0
            };
        }));

        const taskStatsGroup = await prisma.task.groupBy({
            by: ['status'],
            _count: { _all: true },
            where: taskFilter
        });

        const pieData = [
            { name: 'Completed', value: taskStatsGroup.find(s => s.status === 'completed')?._count._all || 0, color: '#10b981' },
            { name: 'In Progress', value: taskStatsGroup.find(s => s.status === 'in_progress')?._count._all || 0, color: '#3b82f6' },
            { name: 'Review', value: taskStatsGroup.find(s => s.status === 'review')?._count._all || 0, color: '#8b5cf6' },
            { name: 'Not Started', value: taskStatsGroup.find(s => s.status === 'todo' || s.status === 'PENDING')?._count._all || 0, color: '#94a3b8' }
        ];

        const [recentPhotos, recentProjects] = await Promise.all([
            prisma.photo.findMany({
                where: photoFilter,
                include: { uploadedBy: { select: { name: true } }, project: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 3
            }),
            prisma.project.findMany({
                where: projectFilter,
                include: { projectManager: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 2
            })
        ]);

        const activityFeed = [
            ...recentPhotos.map(p => ({
                user: p.uploadedBy?.name || 'Member',
                action: 'uploaded a site photo',
                project: p.project?.name || 'Project',
                time: p.createdAt,
                type: 'photo'
            })),
            ...recentProjects.map(p => ({
                user: p.projectManager?.name || 'Admin',
                action: 'created a new project',
                project: p.name,
                time: p.createdAt,
                type: 'system'
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({
            metrics: {
                todayTasks,
                overdueTasks,
                activeProjects,
                openIssues,
                pendingInvoices: pendingInvoicesCount,
                outstandingInvoices: outstandingAmount >= 1000 ? `$${(outstandingAmount / 1000).toFixed(1)}k` : `$${outstandingAmount}`,
                onSiteEmployees,
                recentPhotos: totalPhotosToday
            },
            barData,
            pieData,
            activityFeed
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all companies (company owners) (Super Admin only)
// @route   GET /api/companies
// @access  Private/SuperAdmin
const getCompanies = async (req, res, next) => {
    try {
        const users = await userRepository.find({ role: 'COMPANY_OWNER' });

        const companies = await Promise.all(users.map(async (user) => {
            let company = null;
            if (user.companyId) {
                company = await companyRepository.findById(user.companyId);
            }
            company = company || {};
            const plan = company.subscriptionPlan || company.subscriptionPlanId || {};
            
            const [userCount, projectCount] = await Promise.all([
                userRepository.find({ companyId: company._id || company.id }),
                prisma.project.count({ where: { companyId: company._id || company.id } })
            ]);

            return {
                ...company,
                ...user,
                id: user._id || user.id,
                company_id_ref: company._id || company.id,
                name: company.name || user.fullName || user.name,
                ownerName: user.fullName || user.name,
                email: user.email,
                phone: user.phone || company.phone,
                planName: plan.name || 'No Plan',
                planDetails: plan,
                users: Array.isArray(userCount) ? userCount.length : 1,
                projects: projectCount
            };
        }));

        res.json(companies);
    } catch (error) {
        next(error);
    }
};

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private (Own company only unless SuperAdmin)
const getCompanyById = async (req, res, next) => {
    try {
        const company = await companyRepository.findById(req.params.id);

        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        const compIdStr = company._id ? company._id.toString() : company.id;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId.toString() !== compIdStr) {
            res.status(403);
            throw new Error('Not authorized to access this company');
        }

        res.json(company);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new company (Super Admin only)
// @route   POST /api/companies
// @access  Private/SuperAdmin
const createCompany = async (req, res, next) => {
    try {
        const { name, email, phone, address, startDate, expireDate, plan, planType, password } = req.body;

        const companyExists = await companyRepository.findByName(name);

        if (companyExists) {
            res.status(400);
            throw new Error('Company with this name already exists');
        }

        const userExists = await userRepository.findByEmail(email);
        if (userExists) {
            res.status(400);
            throw new Error('User with this email already exists');
        }

        let finalPlanId = plan;
        if (plan && typeof plan === 'string') {
            const planDoc = await prisma.plan.findFirst({
                where: { name: { equals: plan, mode: 'insensitive' } }
            });
            finalPlanId = planDoc ? planDoc.id : plan;
        }

        const company = await companyRepository.create({
            name,
            email,
            phone,
            address,
            startDate,
            expireDate,
            subscriptionPlanId: finalPlanId,
            planType
        });

        const user = await userRepository.create({
            companyId: company._id || company.id,
            fullName: name + ' Admin',
            email,
            password,
            role: 'COMPANY_OWNER',
            phone
        });

        res.status(201).json({ company, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Update company
// @route   PATCH /api/companies/:id
// @access  Private (Company Owner or SuperAdmin)
const updateCompany = async (req, res, next) => {
    try {
        let companyId = req.params.id;
        let userId = null;

        const user = await userRepository.findById(req.params.id);
        if (user && user.role === 'COMPANY_OWNER') {
            userId = user._id || user.id;
            companyId = user.companyId;
        }

        const company = await companyRepository.findById(companyId);

        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        const compIdStr = company._id ? company._id.toString() : company.id;
        if (req.user.role !== 'SUPER_ADMIN' && (req.user.role !== 'COMPANY_OWNER' || req.user.companyId.toString() !== compIdStr)) {
            res.status(403);
            throw new Error('Not authorized to update this company');
        }

        const updates = { ...req.body };
        delete updates._id;
        delete updates.id;
        
        if (updates.plan) {
            updates.subscriptionPlanId = updates.plan;
            delete updates.plan;
        }

        if (updates.subscriptionPlanId && typeof updates.subscriptionPlanId === 'string') {
            const plan = await prisma.plan.findFirst({
                where: { name: { equals: updates.subscriptionPlanId, mode: 'insensitive' } }
            });
            if (plan) {
                updates.subscriptionPlanId = plan.id;
            } else {
                delete updates.subscriptionPlanId;
            }
        }

        const updatedCompany = await companyRepository.updateById(compIdStr, updates);

        if (userId) {
            const userUpdates = {};
            if (req.body.email) userUpdates.email = req.body.email;
            if (req.body.password) userUpdates.password = req.body.password;

            if (Object.keys(userUpdates).length > 0) {
                await userRepository.updateById(userId, userUpdates);
            }
        }

        res.json(updatedCompany);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete company (User & Company)
// @route   DELETE /api/companies/:id
// @access  Private/SuperAdmin
const deleteCompany = async (req, res, next) => {
    try {
        console.log(`Attempting to delete company/user with ID: ${req.params.id}`);

        const user = await userRepository.findById(req.params.id);

        if (!user) {
            console.log('User not found, trying company direct delete...');
            const companyDirect = await companyRepository.findById(req.params.id);
            if (companyDirect) {
                const compIdStr = companyDirect._id || companyDirect.id;
                await companyRepository.deleteById(compIdStr);
                return res.json({ message: 'Company removed' });
            }
            res.status(404);
            throw new Error('User/Company not found');
        }

        if (user.companyId) {
            await companyRepository.deleteById(user.companyId);
        }

        const userIdStr = user._id || user.id;
        await userRepository.deleteById(userIdStr);

        res.json({ message: 'Company Owner and Company data removed' });
    } catch (error) {
        console.error('Error in deleteCompany:', error);
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    getCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};
