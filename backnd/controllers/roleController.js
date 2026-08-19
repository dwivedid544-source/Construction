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

// Helper function to get permissions for a user
const fetchUserPermissions = async (user) => {
    try {
        let roleId = user.roleId;

        if (!roleId) {
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
                where: { userId: user.id },
                include: { permission: true }
            })
        ]);

        const permissions = new Set(
            rolePermDocs
                .filter(rp => rp.permission)
                .map(rp => rp.permission.key)
        );

        overrideDocs.forEach(o => {
            if (o.permission) {
                if (o.isAllowed) {
                    permissions.add(o.permission.key);
                } else {
                    permissions.delete(o.permission.key);
                }
            }
        });

        let finalPermissions = Array.from(permissions);

        if (user.companyId) {
            let plan = null;
            if (user.companyDetails && user.companyDetails.subscriptionPlanId) {
                // If already loaded/passed
                plan = user.companyDetails.subscriptionPlan || user.companyDetails.subscriptionPlanId;
            } else {
                const company = await prisma.company.findUnique({
                    where: { id: user.companyId },
                    include: { subscriptionPlan: true }
                });
                if (company && company.subscriptionPlan) {
                    plan = company.subscriptionPlan;
                }
            }

            // In Prisma, we mapped JSON columns. Let's parse rolePermissions
            if (plan && plan.rolePermissions) {
                const roleKey = user.role.toUpperCase().replace(/\s/g, '_');
                
                let allowedByPlan = null;
                const rolePermObj = typeof plan.rolePermissions === 'string'
                    ? JSON.parse(plan.rolePermissions)
                    : plan.rolePermissions;
                
                if (rolePermObj) {
                    allowedByPlan = rolePermObj[roleKey];
                    if (!allowedByPlan) {
                        if (roleKey === 'COMPANY_OWNER') {
                            allowedByPlan = rolePermObj['ADMIN'];
                        }
                        if (roleKey === 'PM') {
                            allowedByPlan = rolePermObj['PROJECT_MANAGER'];
                        }
                    }
                }

                if (allowedByPlan && Array.isArray(allowedByPlan)) {
                    finalPermissions = finalPermissions.filter(p => allowedByPlan.includes(p));
                }
            }
        }

        return finalPermissions;
    } catch (error) {
        console.error('Permission fetching error:', error);
        return [];
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
