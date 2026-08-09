/**
 * analyticsService.js — Core ERP Reporting & Analytics Business Logic.
 */

'use strict';

const prisma = require('../config/prisma');

class AnalyticsService {
  /**
   * Executive summary analytics for tenant company.
   */
  async getExecutiveSummary(companyId) {
    const where = { deletedAt: null };
    if (companyId) {
      where.companyId = companyId;
    }

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      totalWorkers,
      openIssues,
      totalInvoicesAmount,
    ] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.project.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.user.count({ where: { ...where, role: 'WORKER' } }),
      prisma.issue.count({ where: { ...where, status: 'OPEN' } }),
      prisma.invoice.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: `${taskCompletionRate}%`,
      },
      workforce: {
        activeWorkers: totalWorkers,
      },
      qualityAndSafety: {
        openIssues,
      },
      finance: {
        totalInvoicedAmount: totalInvoicesAmount._sum.amount || 0,
      },
    };
  }

  /**
   * Helper to format array data into CSV string for export endpoints.
   */
  exportToCsv(dataArray, columns = []) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return '';
    }

    const headers = columns.length ? columns : Object.keys(dataArray[0]);
    const headerRow = headers.join(',');

    const rows = dataArray.map((row) =>
      headers
        .map((col) => {
          let val = row[col] ?? '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    );

    return [headerRow, ...rows].join('\n');
  }
}

module.exports = new AnalyticsService();
