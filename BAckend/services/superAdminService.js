/**
 * superAdminService.js — Super Admin Platform & Tenant Governance Logic.
 */

'use strict';

const prisma = require('../config/prisma');
const { companyRepository, auditLogRepository } = require('../repositories');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/auditLog');

class SuperAdminService {
  /**
   * Calculate platform-wide metrics & ARR/MRR revenue totals.
   */
  async getPlatformStats() {
    const [totalCompanies, activeCompanies, totalUsers, totalProjects, totalTasks] = await Promise.all([
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.company.count({ where: { subscriptionStatus: 'active', deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.task.count({ where: { deletedAt: null } }),
    ]);

    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      include: { subscriptionPlan: true },
    });

    let mrr = 0;
    companies.forEach((c) => {
      if (c.subscriptionStatus === 'active' && c.subscriptionPlan) {
        mrr += c.subscriptionPlan.price || 0;
      }
    });

    return {
      overview: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        totalProjects,
        totalTasks,
      },
      revenue: {
        mrr,
        arr: mrr * 12,
        currency: 'INR',
      },
    };
  }

  /**
   * Update tenant company subscription status or limits.
   */
  async updateCompanySubscription(companyId, updateData, adminUser, req = null) {
    const company = await companyRepository.findByIdOrFail(companyId, 'Company');

    const updated = await companyRepository.updateById(company.id, updateData);

    await logAction({
      userId: adminUser.id,
      companyId: company.id,
      action: 'ADMIN_UPDATE_COMPANY',
      resource: 'Company',
      resourceId: company.id,
      details: updateData,
      req,
    });

    return updated;
  }

  /**
   * Fetch platform audit logs for security monitoring.
   */
  async getPlatformAuditLogs(query = {}) {
    return auditLogRepository.paginate(query);
  }
}

module.exports = new SuperAdminService();
