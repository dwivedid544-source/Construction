/**
 * tenantMiddleware.js — Multi-tenant isolation middleware.
 *
 * Ensures that every authenticated request (except SUPER_ADMIN) is scoped
 * strictly to the user's tenant company ID (`req.user.companyId`).
 */

'use strict';

const AppError = require('../utils/AppError');

/**
 * Middleware enforcing tenant presence on authenticated requests.
 */
function enforceTenant(req, res, next) {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required.'));
  }

  // SUPER_ADMIN can bypass single-tenant scoping if accessing platform-wide features
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (!req.user.companyId) {
    return next(AppError.forbidden('User does not belong to an active tenant company.'));
  }

  next();
}

/**
 * Helper function to inject companyId scoping into a Prisma query filter object.
 *
 * @param {object} whereClause  Existing Prisma `where` clause.
 * @param {object} user         Express `req.user` object.
 * @returns {object}            Scoped `where` clause.
 */
function scopeTenantQuery(whereClause = {}, user) {
  if (!user || user.role === 'SUPER_ADMIN') {
    return whereClause;
  }
  return {
    ...whereClause,
    companyId: user.companyId,
  };
}

module.exports = { enforceTenant, scopeTenantQuery };
