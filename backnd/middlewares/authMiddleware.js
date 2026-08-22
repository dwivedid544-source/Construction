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
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_kaal_construction_saas_2026');
            
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId || decoded.id }
            });
            
            if (!user) {
                res.status(401);
                return next(new Error('Not authorized, user account not found'));
            }

            if (user.isActive === false && user.role !== 'SUPER_ADMIN') {
                res.status(403);
                return next(new Error('Your account is currently under review or inactive. Please contact your administrator.'));
            }

            delete user.password;
            req.user = user;
            req.companyId = user.companyId ? String(user.companyId) : null;

            return next();
        }

        if (!token) {
            res.status(401);
            return next(new Error('Not authorized, no authorization token provided'));
        }
    } catch (error) {
        console.error('DEBUG [protect] error:', error.message);
        res.status(401);
        next(new Error('Not authorized, token validation failed'));
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this resource.`
            });
        }
        next();
    };
};

/**
 * Middleware: Verifies role access for operational creation (Projects, Tasks, Equipment, POs, Daily Logs, Issues, RFIs, Drawings, Photos).
 * Allows Super Admins, Company Owners, Admins, and specified operational roles.
 */
const restrictAdminCreation = (moduleName = 'operational records', allowedRoles = ['PM', 'FOREMAN', 'ENGINEER', 'SUPER_ADMIN', 'COMPANY_OWNER', 'ADMIN', 'WORKER']) => {
    return (req, res, next) => {
        if (['COMPANY_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
            return next();
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Your role (${req.user.role}) is not authorized to create ${moduleName}.`
            });
        }
        next();
    };
};

/**
 * Middleware: Restricts company-level administration (Payroll, Settings, Roles/Permissions, Subscriptions/Billing)
 * strictly to Company Owners and Super Admins.
 */
const restrictPMAdmin = (featureName = 'Company Administration') => {
    return (req, res, next) => {
        if (req.user.role !== 'COMPANY_OWNER' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                message: `${featureName} is restricted to Company Owners.`
            });
        }
        next();
    };
};

const checkPermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not found in request.' });
            }

            if (req.user.role === 'SUPER_ADMIN') return next();

            // Check if permission explicitly requires Company Owner (e.g. financials, settings)
            if (['MANAGE_FINANCIALS', 'ACCESS_SETTINGS', 'MANAGE_ROLES', 'MANAGE_SUBSCRIPTION'].includes(permissionKey)) {
                if (req.user.role !== 'COMPANY_OWNER') {
                    return res.status(403).json({ message: `Access denied: ${permissionKey} is restricted to Company Owners.` });
                }
                return next();
            }

            return next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal server error during permission check' });
        }
    };
};

module.exports = { 
    protect, 
    authorize, 
    checkPermission, 
    restrictAdminCreation, 
    restrictPMAdmin 
};
