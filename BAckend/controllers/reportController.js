/**
 * reportController.js — Core ERP Reporting & Analytics Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');
const prisma = require('../config/prisma');

// GET /api/reports/company
const getCompanyReport = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getExecutiveSummary(req.user.companyId);
  res.json({
    success: true,
    data: summary,
  });
});

// GET /api/reports/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getExecutiveSummary(req.user.companyId);
  res.json({
    success: true,
    data: summary,
  });
});

// GET /api/reports/project/:projectId
const getProjectReport = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: req.user.companyId, deletedAt: null },
  });

  if (!project) {
    throw require('../utils/AppError').notFound('Project not found');
  }

  const [totalTasks, completedTasks] = await Promise.all([
    prisma.task.count({ where: { projectId, deletedAt: null } }),
    prisma.task.count({ where: { projectId, status: 'COMPLETED', deletedAt: null } }),
  ]);

  res.json({
    success: true,
    data: {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%',
      },
    },
  });
});

// GET /api/reports/sidebar-metrics
const getSidebarMetrics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const companyId = req.user.companyId;

  const [taskCount, notificationCount, projects] = await Promise.all([
    prisma.task.count({ where: { assignedToId: userId, status: { not: 'COMPLETED' }, deletedAt: null } }),
    prisma.notification.count({ where: { recipientId: userId, readStatus: false, deletedAt: null } }),
    prisma.project.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, status: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      taskCount,
      notificationCount,
      projects,
    },
  });
});

const getWorkerAttendanceReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

const getForemanAttendanceReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

const getProjectAttendanceReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

const exportAttendanceReport = asyncHandler(async (req, res) => {
  const csv = analyticsService.exportToCsv([], ['Name', 'Role', 'Total Hours']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=Attendance_Report.csv');
  res.status(200).send(csv || 'Name,Role,Total Hours\n');
});

const getDetailedProjectReport = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: req.user.companyId, deletedAt: null },
  });

  if (!project) {
    throw require('../utils/AppError').notFound('Project not found');
  }

  res.json({
    success: true,
    data: { project, jobs: [] },
  });
});

module.exports = {
  getProjectReport,
  getCompanyReport,
  getDashboardStats,
  getSidebarMetrics,
  getWorkerAttendanceReport,
  getForemanAttendanceReport,
  getProjectAttendanceReport,
  exportAttendanceReport,
  getDetailedProjectReport,
};