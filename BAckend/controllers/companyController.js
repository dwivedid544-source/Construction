const { companyRepository, userRepository } = require('../repositories');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Invoice = require('../models/Invoice');
const Photo = require('../models/Photo');
const PurchaseOrder = require('../models/purchaseOrder.model');
const TimeLog = require('../models/TimeLog');
const mongoose = require('mongoose');

// @desc    Get dashboard statistics for a company
// @route   GET /api/companies/dashboard/stats
// @access  Private (Company Admin/Owner)
const getDashboardStats = async (req, res, next) => {
    try {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const companyId = req.user.companyId;
        const userId = req.user._id;
        const role = req.user.role;

        const isStaff = ['WORKER', 'FOREMAN'].includes(role);

        // Define filters based on role
        const taskFilter = { companyId };
        const projectFilter = { companyId, status: 'active' };
        const issueFilter = { companyId, status: 'open' };

        const photoFilter = { companyId };
        if (role === 'CLIENT') {
            const clientProjects = await Project.find({ companyId, clientId: userId }).select('_id').lean();
            const clientProjectIds = clientProjects.map(p => p._id);
            photoFilter.projectId = { $in: clientProjectIds };
            projectFilter._id = { $in: clientProjectIds };
        } else if (isStaff) {
            taskFilter.assignedTo = userId;
            const staffTasks = await Task.find({ assignedTo: userId }).select('projectId');
            const projectIds = staffTasks.map(t => t.projectId).filter(id => id);
            projectFilter._id = { $in: projectIds };
            photoFilter.projectId = projectFilter._id;
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
            Task.countDocuments({ ...taskFilter, dueDate: { $gte: startOfToday, $lte: endOfToday } }),
            Task.countDocuments({ ...taskFilter, status: { $ne: 'completed' }, dueDate: { $lt: startOfToday } }),
            Project.countDocuments(projectFilter),
            Issue.countDocuments(issueFilter),
            Invoice.countDocuments({ companyId, status: { $in: ['unpaid', 'partially_paid', 'overdue'] } }),
            Photo.countDocuments({ ...photoFilter, createdAt: { $gte: startOfToday } }),
            TimeLog.countDocuments({ companyId, clockOut: { $exists: false } })
        ]);

        const unpaidInvoices = await Invoice.find({
            companyId,
            status: { $in: ['unpaid', 'partially_paid', 'overdue'] }
        });
        const outstandingAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        const activeProjectsList = await Project.find(projectFilter).limit(5);

        const barData = await Promise.all(activeProjectsList.map(async (p) => {
            const pos = await PurchaseOrder.find({ projectId: p._id, status: 'received' });
            const spent = pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

            return {
                name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                progress: p.progress || 0,
                budget: p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0
            };
        }));

        const taskStats = await Task.aggregate([
            { $match: taskFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const pieData = [
            { name: 'Completed', value: taskStats.find(s => s._id === 'completed')?.count || 0, color: '#10b981' },
            { name: 'In Progress', value: taskStats.find(s => s._id === 'in_progress')?.count || 0, color: '#3b82f6' },
            { name: 'Review', value: taskStats.find(s => s._id === 'review')?.count || 0, color: '#8b5cf6' },
            { name: 'Not Started', value: taskStats.find(s => s._id === 'todo')?.count || 0, color: '#94a3b8' }
        ];

        const [recentPhotos, recentProjects] = await Promise.all([
            Photo.find(photoFilter).populate('uploadedBy', 'fullName').populate('projectId', 'name').sort({ createdAt: -1 }).limit(3),
            Project.find(projectFilter).populate('createdBy', 'fullName').sort({ createdAt: -1 }).limit(2)
        ]);

        const activityFeed = [
            ...recentPhotos.map(p => ({
                user: p.uploadedBy?.fullName || 'Member',
                action: 'uploaded a site photo',
                project: p.projectId?.name || 'Project',
                time: p.createdAt,
                type: 'photo'
            })),
            ...recentProjects.map(p => ({
                user: p.createdBy?.fullName || 'Admin',
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
                Project.countDocuments({ companyId: company._id || company.id })
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
        if (plan && typeof plan === 'string' && !mongoose.Types.ObjectId.isValid(plan)) {
            const planDoc = await Plan.findOne({ name: new RegExp('^' + plan + '$', 'i') });
            finalPlanId = planDoc ? planDoc._id : null;
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

        if (updates.subscriptionPlanId && typeof updates.subscriptionPlanId === 'string' && !mongoose.Types.ObjectId.isValid(updates.subscriptionPlanId)) {
            const plan = await Plan.findOne({ name: new RegExp('^' + updates.subscriptionPlanId + '$', 'i') });
            if (plan) {
                updates.subscriptionPlanId = plan._id;
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
