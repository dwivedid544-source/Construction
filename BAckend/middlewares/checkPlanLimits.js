/**
 * checkPlanLimits.js — Plan Limit & Feature Flag Enforcement Middleware.
 *
 * Checks if a tenant company has remaining capacity for creating new projects
 * or inviting new team members based on their active subscription plan limits.
 */

'use strict';

const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

/**
 * Helper to fetch tenant company and its associated subscription plan via Prisma.
 */
async function getCompanyAndPlan(companyId) {
  if (!companyId) return { company: null, plan: null };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscriptionPlan: true },
  });

  return { company, plan: company?.subscriptionPlan || null };
}

/**
 * Middleware: Verify if tenant company can create another project.
 */
async function checkProjectLimit(req, res, next) {
  try {
    if (req.user?.role === 'SUPER_ADMIN') return next();

    const companyId = req.user?.companyId;
    if (!companyId) {
      return next(AppError.badRequest('Company ID missing from session.'));
    }

    const { company, plan } = await getCompanyAndPlan(companyId);
    if (!company) {
      return next(AppError.notFound('Company not found.'));
    }

    const currentProjectCount = await prisma.project.count({
      where: { companyId, deletedAt: null },
    });

    const maxProjects = plan ? plan.maxProjects : company.maxProjects || 5;

    if (currentProjectCount >= maxProjects) {
      return next(
        AppError.forbidden(
          `Project limit reached. Your plan allows up to ${maxProjects} projects. Please upgrade your subscription.`
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Verify if tenant company can add another user seat.
 */
async function checkUserLimit(req, res, next) {
  try {
    if (req.user?.role === 'SUPER_ADMIN') return next();

    const companyId = req.user?.companyId;
    if (!companyId) {
      return next(AppError.badRequest('Company ID missing from session.'));
    }

    const { company, plan } = await getCompanyAndPlan(companyId);
    if (!company) {
      return next(AppError.notFound('Company not found.'));
    }

    const currentUserCount = await prisma.user.count({
      where: {
        companyId,
        role: { not: 'CLIENT' },
        deletedAt: null,
      },
    });

    const maxUsers = plan ? plan.maxUsers : company.maxUsers || 10;

    if (currentUserCount >= maxUsers) {
      return next(
        AppError.forbidden(
          `User seat limit reached. Your plan allows up to ${maxUsers} team members. Please upgrade your subscription.`
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Check if tenant subscription includes a specific feature flag.
 * @param {string} featureName
 */
function checkFeatureFlag(featureName) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'SUPER_ADMIN') return next();

      const { plan } = await getCompanyAndPlan(req.user?.companyId);

      if (!plan || !Array.isArray(plan.features) || !plan.features.includes(featureName)) {
        return next(
          AppError.forbidden(
            `The feature '${featureName}' is not included in your current subscription plan. Please upgrade.`
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  checkProjectLimit,
  checkUserLimit,
  checkFeatureFlag,
};
