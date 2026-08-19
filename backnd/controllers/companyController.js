const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// @desc    Get dashboard statistics for a company
// @route   GET /api/companies/dashboard/stats
// @access  Private (Company Admin/Owner)
const getDashboardStats = async (req, res, next) => {
    try {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const companyId = req.user.companyId;
        const userId = req.user.id;
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
            taskFilter.assignedTo = userId;
            const staffTasks = await prisma.task.findMany({
                where: { assignedTo: userId },
                select: { projectId: true }
            });
            const projectIds = staffTasks.map(t => t.projectId).filter(id => id);
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
            prisma.task.count({
                where: {
                    ...taskFilter,
                    dueDate: { gte: startOfToday, lte: endOfToday }
                }
            }),
            prisma.task.count({
                where: {
                    ...taskFilter,
                    NOT: { status: 'completed' },
                    dueDate: { lt: startOfToday }
                }
            }),
            prisma.project.count({ where: projectFilter }),
            prisma.issue.count({ where: issueFilter }),
            prisma.invoice.count({
                where: {
                    companyId,
                    status: { in: ['unpaid', 'partially_paid', 'overdue'] }
                }
            }),
            prisma.photo.count({
                where: {
                    ...photoFilter,
                    createdAt: { gte: startOfToday }
                }
            }),
            prisma.timeLog.count({
                where: {
                    companyId,
                    clockOut: null
                }
            })
        ]);

        // Outstanding invoices sum logic
        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                status: { in: ['unpaid', 'partially_paid', 'overdue'] }
            }
        });
        const outstandingAmount = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        // Project Progress (Bar Chart Data)
        const activeProjectsList = await prisma.project.findMany({
            where: projectFilter,
            take: 5
        });

        const barData = await Promise.all(activeProjectsList.map(async (p) => {
            const pos = await prisma.purchaseOrder.findMany({
                where: { projectId: p.id, status: 'Approved' } // mapping legacy 'received' to 'Approved' or similar check
            });
            const spent = pos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);

            return {
                name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                progress: p.progress || 0,
                budget: Number(p.budget) > 0 ? Math.round((spent / Number(p.budget)) * 100) : 0
            };
        }));

        const taskStats = await prisma.task.groupBy({
            by: ['status'],
            where: taskFilter,
            _count: {
                id: true
            }
        });

        const pieData = [
            { name: 'Completed', value: taskStats.find(s => s.status === 'completed')?._count?.id || 0, color: '#10b981' },
            { name: 'In Progress', value: taskStats.find(s => s.status === 'in_progress' || s.status === 'IN_PROGRESS')?._count?.id || 0, color: '#3b82f6' },
            { name: 'Review', value: taskStats.find(s => s.status === 'review')?._count?.id || 0, color: '#8b5cf6' },
            { name: 'Not Started', value: taskStats.find(s => s.status === 'todo' || s.status === 'TODO')?._count?.id || 0, color: '#94a3b8' }
        ];

        // Recent Activity (Feed)
        const [recentPhotos, recentProjects] = await Promise.all([
            prisma.photo.findMany({
                where: photoFilter,
                include: {
                    uploader: { select: { fullName: true } },
                    project: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 3
            }),
            prisma.project.findMany({
                where: projectFilter,
                include: {
                    creator: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 2
            })
        ]);

        const activityFeed = [
            ...recentPhotos.map(p => ({
                user: p.uploader?.fullName || 'Member',
                action: 'uploaded a site photo',
                project: p.project?.name || 'Project',
                time: p.createdAt,
                type: 'photo'
            })),
            ...recentProjects.map(p => ({
                user: p.creator?.fullName || 'Admin',
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
        const users = await prisma.user.findMany({
            where: { role: 'COMPANY_OWNER' },
            include: {
                company: {
                    include: {
                        subscriptionPlan: true
                    }
                }
            }
        });

        const companies = await Promise.all(users.map(async (user) => {
            const company = user.company || {};
            const plan = company.subscriptionPlan || {};
            
            const [userCount, projectCount] = await Promise.all([
                prisma.user.count({ where: { companyId: company.id } }),
                prisma.project.count({ where: { companyId: company.id } })
            ]);

            return {
                ...company,
                ...user,
                _id: user.id, // compatibility fallback
                id: user.id,
                company_id_ref: company.id,
                name: company.name || user.fullName,
                ownerName: user.fullName,
                email: user.email,
                phone: user.phone || company.phone,
                planName: plan.name || 'No Plan',
                planDetails: plan,
                users: userCount,
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
        const company = await prisma.company.findUnique({
            where: { id: req.params.id }
        });

        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        // Authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== company.id) {
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

        const companyExists = await prisma.company.findUnique({
            where: { name }
        });

        if (companyExists) {
            res.status(400);
            throw new Error('Company with this name already exists');
        }

        const userExists = await prisma.user.findUnique({
            where: { email }
        });
        if (userExists) {
            res.status(400);
            throw new Error('User with this email already exists');
        }

        // --- RESOLVE PLAN IF STRING ---
        let finalPlanId = plan;
        if (plan && typeof plan === 'string') {
            const isProbablyId = plan.length >= 24;
            if (!isProbablyId) {
                const planDoc = await prisma.plan.findFirst({
                    where: { name: { equals: plan } }
                });
                finalPlanId = planDoc ? planDoc.id : null;
            }
        }

        const company = await prisma.company.create({
            data: {
                name,
                email,
                phone,
                address,
                startDate: startDate ? new Date(startDate) : null,
                expireDate: expireDate ? new Date(expireDate) : null,
                subscriptionPlanId: finalPlanId,
                planType
            }
        });

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                companyId: company.id,
                fullName: name + ' Admin',
                email,
                password: hashedPassword,
                role: 'COMPANY_OWNER',
                phone
            }
        });

        res.status(201).json({ company, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Update company settings
// @route   PATCH /api/companies/:id
// @access  Private (Company Owner or SuperAdmin)
const updateCompany = async (req, res, next) => {
    try {
        let companyId = req.params.id;
        let userId = null;

        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });
        if (user && user.role === 'COMPANY_OWNER') {
            userId = user.id;
            companyId = user.companyId;
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }

        // Authorization check
        if (req.user.role !== 'SUPER_ADMIN' && (req.user.role !== 'COMPANY_OWNER' || req.user.companyId !== company.id)) {
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
            const isProbablyId = updates.subscriptionPlanId.length >= 24;
            if (!isProbablyId) {
                const plan = await prisma.plan.findFirst({
                    where: { name: { equals: updates.subscriptionPlanId } }
                });
                if (plan) {
                    updates.subscriptionPlanId = plan.id;
                } else {
                    delete updates.subscriptionPlanId;
                }
            }
        }

        // Parse dates safely
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.expireDate) updates.expireDate = new Date(updates.expireDate);

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: updates
        });

        if (userId) {
            const userUpdates = {};
            if (req.body.email) userUpdates.email = req.body.email;
            if (req.body.password) {
                userUpdates.password = await hashPassword(req.body.password);
            }

            if (Object.keys(userUpdates).length > 0) {
                await prisma.user.update({
                    where: { id: userId },
                    data: userUpdates
                });
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

        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });

        if (!user) {
            console.log('User not found, trying company direct delete...');
            const companyDirect = await prisma.company.findUnique({
                where: { id: req.params.id }
            });
            if (companyDirect) {
                await prisma.company.delete({
                    where: { id: req.params.id }
                });
                return res.json({ message: 'Company removed' });
            }
            res.status(404);
            throw new Error('User/Company not found');
        }

        if (user.companyId) {
            await prisma.company.delete({
                where: { id: user.companyId }
            });
        }

        await prisma.user.delete({
            where: { id: req.params.id }
        });

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
