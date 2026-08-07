const jwt = require('jsonwebtoken');
const { userRepository, permissionRepository } = require('../repositories');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kaal_construction_management_secret_key_2026');
      const userId = decoded.id || decoded.userId;

      req.user = await userRepository.findById(userId);

      if (!req.user) {
        return next(AppError.unauthorized('Not authorized, user not found'));
      }

      // Ensure normalized id property
      if (req.user && !req.user._id) {
        req.user._id = req.user.id;
      }

      return next();
    }

    if (!token) {
      return next(AppError.unauthorized('Not authorized, no token provided'));
    }
  } catch (error) {
    return next(AppError.unauthorized('Not authorized, token validation failed'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden(`User role ${req.user?.role || 'GUEST'} is not authorized to access this route`));
    }
    next();
  };
};

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(AppError.unauthorized('User not found in req. Check protect middleware.'));
      }

      if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'COMPANY_OWNER') {
        return next();
      }

      const permission = await permissionRepository.findOne({ name: permissionKey });
      if (!permission) {
        return next();
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = { protect, authorize, checkPermission };
