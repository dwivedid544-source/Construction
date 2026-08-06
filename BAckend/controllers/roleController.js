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
                _id: role.id,
                permissions: rolePermDocs
                    .filter(rp => rp.permission)
                    .map(rp => rp.permission.name || rp.permission.id)
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
            orderBy: [{ module: 'asc' }, { name: 'asc' }]
        });
        res.json(permissions.map(p => ({ ...p, _id: p.id })));
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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        let roleId = user.roleId;
        if (!roleId && user.role) {
            const roleDoc = await prisma.role.findFirst({ where: { name: user.role } });
            if (roleDoc) roleId = roleDoc.id;
        }

        // Parallel fetch for efficiency
        const [rolePermDocs, overrideDocs] = await Promise.all([
            roleId ? prisma.rolePermission.findMany({ where: { roleId }, include: { permission: true } }) : [],
            prisma.userPermission.findMany({ where: { userId }, include: { permission: true } })
        ]);

        const rolePermissions = rolePermDocs
            .filter(rp => rp.permission)
            .map(rp => rp.permission.name || rp.permission.id);

        const overrides = overrideDocs
            .filter(o => o.permission)
            .map(o => ({
                key: o.permission.name || o.permission.id,
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

        if (Array.isArray(overrides)) {
            for (const override of overrides) {
                const perm = await prisma.permission.findFirst({
                    where: { OR: [{ name: override.key }, { id: override.key }] }
                });
                if (!perm) continue;

                await prisma.userPermission.upsert({
                    where: {
                        userId_permissionId: { userId, permissionId: perm.id }
                    },
                    update: { isAllowed: override.isAllowed },
                    create: { userId, permissionId: perm.id, isAllowed: override.isAllowed }
                });
            }
        }

        res.json({ message: 'User overrides updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Helper function to get permissions for a user
const fetchUserPermissions = async (user) => {
    try {
        const userId = user._id || user.id;
        let roleId = user.roleId?.id || user.roleId;

        if (!roleId && user.role) {
            const roleDoc = await prisma.role.findFirst({ where: { name: user.role } });
            if (roleDoc) roleId = roleDoc.id;
        }

        const [rolePermDocs, overrideDocs] = await Promise.all([
            roleId ? prisma.rolePermission.findMany({ where: { roleId }, include: { permission: true } }) : [],
            userId ? prisma.userPermission.findMany({ where: { userId }, include: { permission: true } }) : []
        ]);

        const permissions = new Set(
            rolePermDocs
                .filter(rp => rp.permission)
                .map(rp => rp.permission.name || rp.permission.id)
        );

        overrideDocs.forEach(o => {
            if (o.permission) {
                const permKey = o.permission.name || o.permission.id;
                if (o.isAllowed) {
                    permissions.add(permKey);
                } else {
                    permissions.delete(permKey);
                }
            }
        });

        let finalPermissions = Array.from(permissions);

        if (user.companyId) {
            let plan = null;
            if (user.companyDetails && user.companyDetails.subscriptionPlanId) {
                plan = user.companyDetails.subscriptionPlanId;
            } else {
                const company = await prisma.company.findUnique({ where: { id: user.companyId } });
                if (company && company.subscriptionPlanId) {
                    plan = await prisma.plan.findUnique({ where: { id: company.subscriptionPlanId } });
                    if (!plan) {
                        plan = await prisma.plan.findFirst({
                            where: { name: { equals: company.subscriptionPlanId, mode: 'insensitive' } }
                        });
                    }
                }
            }

            if (plan && plan.features && Array.isArray(plan.features)) {
                // If plan has feature restrictions, match permissions
                // Note: plan.features contains feature strings
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

        const role = await prisma.role.findFirst({ where: { name: roleName } });
        if (!role) {
            res.status(404);
            throw new Error('Role not found');
        }

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

        if (Array.isArray(permissions)) {
            for (const key of permissions) {
                const perm = await prisma.permission.findFirst({
                    where: { OR: [{ name: key }, { id: key }] }
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

        res.json({ message: 'Role permissions updated successfully' });
    } catch (error) {
        next(error);
    }
};

const bulkUpdateRolePermissions = async (req, res, next) => {
    try {
        const { roleUpdates } = req.body;

        if (Array.isArray(roleUpdates)) {
            for (const update of roleUpdates) {
                const { roleName, permissions } = update;
                const role = await prisma.role.findFirst({ where: { name: roleName } });
                if (role) {
                    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
                    if (Array.isArray(permissions)) {
                        for (const key of permissions) {
                            const perm = await prisma.permission.findFirst({
                                where: { OR: [{ name: key }, { id: key }] }
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
