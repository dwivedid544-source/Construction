const prisma = require('../config/prisma');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Admin)
const getRoles = async (req, res, next) => {
    try {
        const roles = await prisma.role.findMany();
        
        // Enhance roles with their permissions
        const rolesWithPermissions = await Promise.all(roles.map(async (role) => {
            const rolePermDocs = await prisma.rolePermission.findMany({
                where: { roleId: role.id },
                include: { permission: true }
            });
            return {
                ...role,
                _id: role.id, // compatibility fallback
                permissions: rolePermDocs
                    .filter(rp => rp.permission)
                    .map(rp => rp.permission.key)
            };
        }));
        
        res.json(rolesWithPermissions);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all permissions
// @route   GET /api/roles/permissions
// @access  Private (Admin)
const getAllPermissions = async (req, res, next) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [
                { module: 'asc' },
                { key: 'asc' } // sorting by key since name is not in permission model, key represents name
            ]
        });
        res.json(permissions);
    } catch (error) {
        next(error);
    }
};

// @desc    Get user permissions (including overrides)
// @route   GET /api/roles/user/:userId
// @access  Private (Admin)
const getUserPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        let roleId = user.roleId;
        if (!roleId) {
            const roleDoc = await prisma.role.findUnique({
                where: { name: user.role }
            });
            if (roleDoc) roleId = roleDoc.id;
        }

        // Parallel fetch for efficiency
        const [rolePermDocs, overrideDocs] = await Promise.all([
            roleId ? prisma.rolePermission.findMany({
                where: { roleId },
                include: { permission: true }
            }) : [],
            prisma.userPermission.findMany({
                where: { userId },
                include: { permission: true }
            })
        ]);

        const rolePermissions = rolePermDocs
            .filter(rp => rp.permission)
            .map(rp => rp.permission.key);

        const overrides = overrideDocs
            .filter(o => o.permission)
            .map(o => ({
                key: o.permission.key,
                isAllowed: o.isAllowed
            }));

        res.json({ rolePermissions, overrides });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user permission overrides
// @route   POST /api/roles/user/:userId/overrides
// @access  Private (Admin)
const updateUserOverrides = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { overrides } = req.body; // Array of { key: 'VIEW_RFI', isAllowed: true/false }

        for (const override of overrides) {
            const perm = await prisma.permission.findUnique({
                where: { key: override.key }
            });
            if (!perm) continue;

            await prisma.userPermission.upsert({
                where: {
                    userId_permissionId: {
                        userId,
                        permissionId: perm.id
                    }
                },
                update: {
                    isAllowed: override.isAllowed
                },
                create: {
                    userId,
                    permissionId: perm.id,
                    isAllowed: override.isAllowed
                }
            });
        }

        res.json({ message: 'User overrides updated successfully' });
    } catch (error) {
        next(error);
    }
};

const DEFAULT_ROLE_PERMISSIONS = {
    SUPER_ADMIN: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'CREATE_PROJECT', 'EDIT_PROJECT', 'DELETE_PROJECT', 'APPROVE_PROJECT',
        'VIEW_TASKS', 'CREATE_TASK', 'EDIT_TASK', 'DELETE_TASK', 'VIEW_CHAT', 'CLOCK_IN_OUT', 'CLOCK_IN_CREW',
        'VIEW_TIMESHEETS', 'APPROVE_TIMESHEETS', 'VIEW_DAILY_LOGS', 'CREATE_DAILY_LOG', 'APPROVE_DAILY_LOG',
        'VIEW_ISSUES', 'CREATE_ISSUE', 'EDIT_ISSUE', 'VIEW_DRAWINGS', 'CREATE_DRAWING', 'VIEW_PHOTOS', 'UPLOAD_PHOTO',
        'VIEW_EQUIPMENT', 'CREATE_EQUIPMENT', 'EDIT_EQUIPMENT', 'VIEW_RFI', 'CREATE_RFI', 'APPROVE_RFI',
        'VIEW_PAYROLL', 'INITIATE_PAYROLL', 'APPROVE_PAYROLL', 'VIEW_PO', 'CREATE_PO', 'EDIT_PO', 'APPROVE_PO',
        'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'APPROVE_INVOICE', 'VIEW_REPORTS',
        'VIEW_TEAM', 'MANAGE_USERS', 'ACCESS_SETTINGS', 'MANAGE_FINANCIALS', 'MANAGE_ROLES', 'MANAGE_SUBSCRIPTION'
    ],
    COMPANY_OWNER: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'EDIT_PROJECT', 'DELETE_PROJECT', 'APPROVE_PROJECT',
        'VIEW_TASKS', 'EDIT_TASK', 'DELETE_TASK', 'VIEW_CHAT', 'CLOCK_IN_OUT',
        'VIEW_TIMESHEETS', 'APPROVE_TIMESHEETS', 'VIEW_DAILY_LOGS', 'EDIT_DAILY_LOG', 'APPROVE_DAILY_LOG',
        'VIEW_ISSUES', 'EDIT_ISSUE', 'VIEW_DRAWINGS', 'VIEW_PHOTOS',
        'VIEW_EQUIPMENT', 'EDIT_EQUIPMENT', 'VIEW_RFI', 'APPROVE_RFI',
        'VIEW_PAYROLL', 'INITIATE_PAYROLL', 'APPROVE_PAYROLL', 'VIEW_PO', 'EDIT_PO', 'APPROVE_PO',
        'VIEW_INVOICES', 'EDIT_INVOICE', 'APPROVE_INVOICE', 'VIEW_REPORTS',
        'VIEW_TEAM', 'MANAGE_USERS', 'ACCESS_SETTINGS', 'MANAGE_FINANCIALS', 'MANAGE_ROLES', 'MANAGE_SUBSCRIPTION'
    ],
    PM: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'CREATE_PROJECT', 'EDIT_PROJECT',
        'VIEW_TASKS', 'CREATE_TASK', 'EDIT_TASK', 'VIEW_CHAT', 'CLOCK_IN_OUT', 'CLOCK_IN_CREW',
        'VIEW_TIMESHEETS', 'EDIT_TIMESHEETS', 'VIEW_DAILY_LOGS', 'CREATE_DAILY_LOG', 'EDIT_DAILY_LOG',
        'VIEW_ISSUES', 'CREATE_ISSUE', 'EDIT_ISSUE', 'VIEW_DRAWINGS', 'CREATE_DRAWING', 'VIEW_PHOTOS', 'UPLOAD_PHOTO',
        'VIEW_EQUIPMENT', 'CREATE_EQUIPMENT', 'EDIT_EQUIPMENT', 'VIEW_RFI', 'CREATE_RFI',
        'VIEW_PO', 'CREATE_PO', 'EDIT_PO', 'VIEW_INVOICES', 'CREATE_INVOICE', 'VIEW_REPORTS',
        'VIEW_TEAM', 'MANAGE_PROJECTS', 'MANAGE_TASKS'
    ],
    FOREMAN: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_TASKS', 'CREATE_TASK', 'EDIT_TASK', 'VIEW_CHAT', 'CLOCK_IN_OUT', 'CLOCK_IN_CREW',
        'VIEW_TIMESHEETS', 'VIEW_DAILY_LOGS', 'CREATE_DAILY_LOG', 'VIEW_ISSUES', 'CREATE_ISSUE', 'VIEW_DRAWINGS', 'VIEW_PHOTOS', 'UPLOAD_PHOTO',
        'VIEW_EQUIPMENT', 'VIEW_RFI', 'CREATE_RFI', 'VIEW_PO', 'CREATE_PO', 'MANAGE_TASKS'
    ],
    ENGINEER: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_TASKS', 'VIEW_CHAT', 'CLOCK_IN_OUT',
        'VIEW_DAILY_LOGS', 'VIEW_ISSUES', 'CREATE_ISSUE', 'VIEW_DRAWINGS', 'CREATE_DRAWING', 'VIEW_PHOTOS', 'UPLOAD_PHOTO', 'VIEW_RFI', 'VIEW_REPORTS'
    ],
    WORKER: [
        'VIEW_DASHBOARD', 'VIEW_TASKS', 'VIEW_CHAT', 'CLOCK_IN_OUT',
        'VIEW_DAILY_LOGS', 'CREATE_DAILY_LOG', 'VIEW_ISSUES', 'CREATE_ISSUE', 'VIEW_PHOTOS', 'UPLOAD_PHOTO'
    ],
    SUBCONTRACTOR: [
        'VIEW_DASHBOARD', 'VIEW_TASKS', 'VIEW_CHAT', 'CLOCK_IN_OUT',
        'VIEW_DAILY_LOGS', 'VIEW_ISSUES', 'CREATE_ISSUE', 'VIEW_PHOTOS', 'VIEW_DRAWINGS'
    ],
    CLIENT: [
        'VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_PHOTOS', 'VIEW_INVOICES', 'VIEW_REPORTS'
    ]
};

// Helper function to get permissions for a user
const fetchUserPermissions = async (user) => {
    try {
        const userRole = (user.role || 'WORKER').toUpperCase();
        const baseDefaults = DEFAULT_ROLE_PERMISSIONS[userRole] || DEFAULT_ROLE_PERMISSIONS.WORKER;
        const permissions = new Set(baseDefaults);

        let roleId = user.roleId;
        if (!roleId && user.role) {
            const roleDoc = await prisma.role.findUnique({
                where: { name: user.role }
            });
            if (roleDoc) roleId = roleDoc.id;
        }

        const [rolePermDocs, overrideDocs] = await Promise.all([
            roleId ? prisma.rolePermission.findMany({
                where: { roleId },
                include: { permission: true }
            }) : [],
            prisma.userPermission.findMany({
                where: { userId: user.id || user._id },
                include: { permission: true }
            })
        ]);

        rolePermDocs.forEach(rp => {
            if (rp.permission && rp.permission.key) {
                permissions.add(rp.permission.key);
            }
        });

        overrideDocs.forEach(o => {
            if (o.permission && o.permission.key) {
                if (o.isAllowed) {
                    permissions.add(o.permission.key);
                } else {
                    permissions.delete(o.permission.key);
                }
            }
        });

        return Array.from(permissions);
    } catch (error) {
        console.error('Permission fetching error:', error);
        return DEFAULT_ROLE_PERMISSIONS[user?.role] || [];
    }
};

// @desc    Get permissions for current user
// @route   GET /api/roles/my-permissions
// @access  Private
const getMyPermissions = async (req, res, next) => {
    try {
        if (req.user.role === 'SUPER_ADMIN') {
            return res.json({ role: 'SUPER_ADMIN', permissions: ['ALL'] });
        }

        const permissions = await fetchUserPermissions(req.user);

        res.json({
            role: req.user.role,
            permissions
        });
    } catch (error) {
        next(error);
    }
};

const updateRolePermissions = async (req, res, next) => {
    try {
        const { roleName } = req.params;
        const { permissions } = req.body; // Array of permission keys

        const role = await prisma.role.findUnique({
            where: { name: roleName }
        });
        if (!role) {
            res.status(404);
            throw new Error('Role not found');
        }

        await prisma.rolePermission.deleteMany({
            where: { roleId: role.id }
        });

        for (const key of permissions) {
            const perm = await prisma.permission.findUnique({
                where: { key }
            });
            if (perm) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: perm.id
                    }
                });
            }
        }

        res.json({ message: 'Role permissions updated successfully' });
    } catch (error) {
        next(error);
    }
};

const bulkUpdateRolePermissions = async (req, res, next) => {
    try {
        const { roleUpdates } = req.body;

        for (const update of roleUpdates) {
            const { roleName, permissions } = update;
            const role = await prisma.role.findUnique({
                where: { name: roleName }
            });
            if (role) {
                await prisma.rolePermission.deleteMany({
                    where: { roleId: role.id }
                });
                for (const key of permissions) {
                    const perm = await prisma.permission.findUnique({
                        where: { key }
                    });
                    if (perm) {
                        await prisma.rolePermission.create({
                            data: {
                                roleId: role.id,
                                permissionId: perm.id
                            }
                        });
                    }
                }
            }
        }

        res.json({ message: 'All role permissions updated successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRoles,
    getAllPermissions,
    getUserPermissions,
    updateUserOverrides,
    getMyPermissions,
    updateRolePermissions,
    bulkUpdateRolePermissions,
    fetchUserPermissions
};
