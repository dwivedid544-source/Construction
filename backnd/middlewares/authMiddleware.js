const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('DEBUG [protect]: Decoded userId:', decoded.userId);
            
            req.user = await prisma.user.findUnique({
                where: { id: decoded.userId }
            });
            
            if (req.user) {
                // Equivalent to .select('-password')
                delete req.user.password;
                console.log('DEBUG [protect]: User found:', req.user.id, 'Role:', req.user.role);
            } else {
                console.log('DEBUG [protect]: User found: null');
            }

            if (!req.user) {
                res.status(401);
                return next(new Error('Not authorized, user not found'));
            }

            return next();
        }

        if (!token) {
            console.log('DEBUG [protect]: No token found in headers');
            res.status(401);
            return next(new Error('Not authorized, no token'));
        }
    } catch (error) {
        console.error('DEBUG [protect] error:', error.message);
        res.status(401);
        next(new Error('Not authorized, token failed'));
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error(`User role ${req.user.role} is not authorized to access this route`));
        }
        next();
    };
};

const checkPermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            console.log('DEBUG [checkPermission]: User role:', req.user ? req.user.role : 'MISSING');
            if (!req.user) {
                res.status(401);
                return next(new Error('User not found in req. Check protect middleware.'));
            }

            if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'COMPANY_OWNER') return next();

            // 1. Find the permission ID by key
            const permission = await prisma.permission.findUnique({
                where: { key: permissionKey }
            });
            
            if (!permission) {
                // If permission key doesn't exist in DB, fallback to legacy role-based check
                console.warn(`Permission key not found: ${permissionKey}. Falling back to default role access.`);
                return next();
            }

            // 2. Check User-specific override
            const userOverride = await prisma.userPermission.findUnique({
                where: {
                    userId_permissionId: {
                        userId: req.user.id,
                        permissionId: permission.id
                    }
                }
            });

            if (userOverride) {
                if (userOverride.isAllowed) return next();
                res.status(403);
                return next(new Error(`Permission denied: ${permissionKey} is explicitly revoked for this user.`));
            }

            // 3. Check Role-based permission
            let roleId = req.user.roleId;
            if (!roleId) {
                const roleDoc = await prisma.role.findUnique({
                    where: { name: req.user.role }
                });
                if (roleDoc) roleId = roleDoc.id;
            }

            if (roleId) {
                const rolePerm = await prisma.rolePermission.findUnique({
                    where: {
                        roleId_permissionId: {
                            roleId: roleId,
                            permissionId: permission.id
                        }
                    }
                });
                if (rolePerm) return next();
            }

            return next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500);
            next(new Error('Internal server error during permission check'));
        }
    };
};

module.exports = { protect, authorize, checkPermission };
