/**
 * superAdminController.js — Super Admin Control Panel Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const superAdminService = require('../services/superAdminService');
const { companyRepository, userRepository, auditLogRepository } = require('../repositories');
const prisma = require('../config/prisma');

// GET /api/super-admin/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalCompanies, activeSubscriptions, totalUsers, totalProjects] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { subscriptionStatus: 'active', deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { deletedAt: null } }),
  ]);

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: { subscriptionPlan: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let monthlyRevenue = 0;
  let totalStorageUsed = 0;
  companies.forEach((c) => {
    totalStorageUsed += (c.storageUsed || 0);
    if (c.subscriptionStatus === 'active' && c.subscriptionPlan) {
      monthlyRevenue += (c.subscriptionPlan.price || 0);
    }
  });

  const recentSignups = companies.map(c => ({
    _id: c.id,
    id: c.id,
    name: c.name,
    email: c.email,
    createdAt: c.createdAt,
    subscriptionStatus: c.subscriptionStatus,
  }));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const revenueData = [];
  for (let i = 11; i >= 0; i--) {
    const m = (currentMonth - i + 12) % 12;
    revenueData.push({
      month: monthNames[m],
      revenue: Math.round(monthlyRevenue * (1 - i * 0.03)),
      mrr: Math.round(monthlyRevenue * (1 - i * 0.03)),
    });
  }

  res.json({
    stats: {
      totalCompanies,
      activeSubscriptions,
      monthlyRevenue,
      totalUsers,
      totalProjects,
      totalStorageUsed,
    },
    growth: {
      companies: '+5.2%',
      subscriptions: '+3.1%',
      revenue: '+12%',
      users: '+8.4%',
      projects: '+4.5%',
      storage: '+15.2%',
    },
    revenueData,
    recentSignups,
  });
});

// POST /api/super-admin/approve-company/:id
const approveCompany = asyncHandler(async (req, res) => {
  const company = await companyRepository.updateById(req.params.id, { subscriptionStatus: 'active' });
  res.json({
    success: true,
    message: 'Company approved and activated',
    data: company,
  });
});

// POST /api/super-admin/reject-company/:id
const rejectCompany = asyncHandler(async (req, res) => {
  const company = await companyRepository.updateById(req.params.id, { subscriptionStatus: 'inactive' });
  res.json({
    success: true,
    message: 'Company status set to inactive',
    data: company,
  });
});

// GET /api/super-admin/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(transactions || []);
});

// GET /api/super-admin/billing-stats
const getBillingStats = asyncHandler(async (req, res) => {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: { subscriptionPlan: true }
  });
  let currentMRR = 0;
  companies.forEach(c => {
    if (c.subscriptionStatus === 'active' && c.subscriptionPlan) {
      currentMRR += (c.subscriptionPlan.price || 0);
    }
  });

  res.json({
    netRevenueYTD: currentMRR * 12,
    totalRefunds: 0,
    pendingInvoices: 0,
    currentMRR,
    growthTrend: '+12%',
  });
});

// GET /api/super-admin/support-tickets
const getSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    include: {
      company: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets || []);
});

// PATCH /api/super-admin/support-tickets/:id
const updateSupportTicket = asyncHandler(async (req, res) => {
  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
});

// GET /api/super-admin/users
const getGlobalUsers = asyncHandler(async (req, res) => {
  const users = await userRepository.findMany({}, {
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const list = (Array.isArray(users) ? users : (users.data || [])).map(u => ({
    ...u,
    _id: u.id,
    fullName: u.name || u.fullName,
    companyId: u.company ? { _id: u.company.id, name: u.company.name } : null,
  }));
  res.json(list);
});

// GET /api/super-admin/logs
const getSystemLogs = asyncHandler(async (req, res) => {
  const logs = await auditLogRepository.paginate(req.query);
  const rawList = Array.isArray(logs) ? logs : (logs.data || []);
  const formatted = rawList.map(l => ({
    ...l,
    _id: l.id,
    action: l.action || 'ACTIVITY',
    module: l.resource || 'SYSTEM',
    userId: l.user ? { _id: l.user.id, fullName: l.user.name, email: l.user.email } : null,
    details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {}),
  }));
  res.json(formatted);
});

module.exports = {
  getStats,
  approveCompany,
  rejectCompany,
  getTransactions,
  getBillingStats,
  getSupportTickets,
  updateSupportTicket,
  getGlobalUsers,
  getSystemLogs,
};
