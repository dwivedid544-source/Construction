/**
 * rfiController.js — Request For Information (RFI) Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const rfiService = require('../services/rfiService');
const prisma = require('../config/prisma');

// GET /api/rfis
const getRFIs = asyncHandler(async (req, res) => {
  const result = await rfiService.getRfis(req.query, req.user);
  const rawList = Array.isArray(result) ? result : (result.data || []);
  const list = rawList.map((r) => ({
    ...r,
    _id: r.id,
    rfiNumber: r.rfiNumber || `RFI-#${r.number || 1}`,
    subject: r.title || r.subject || 'RFI Request',
    raisedBy: r.createdBy ? { _id: r.createdBy.id, fullName: r.createdBy.name } : (r.raisedBy || null),
    projectId: r.project ? { _id: r.project.id, name: r.project.name } : (r.projectId || null),
  }));
  res.json(list);
});

// GET /api/rfis/stats
const getRFIStats = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const where = { companyId, deletedAt: null };

  const [total, open, inReview, answered, closed, recentRFIs] = await Promise.all([
    prisma.rFI.count({ where }),
    prisma.rFI.count({ where: { ...where, status: 'OPEN' } }),
    prisma.rFI.count({ where: { ...where, status: 'IN_REVIEW' } }),
    prisma.rFI.count({ where: { ...where, status: 'ANSWERED' } }),
    prisma.rFI.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.rFI.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { project: true, createdBy: true },
    }),
  ]);

  const formattedRFIs = recentRFIs.map((r) => ({
    ...r,
    _id: r.id,
    rfiNumber: `RFI-#${r.number}`,
    subject: r.title,
    raisedBy: r.createdBy ? { _id: r.createdBy.id, fullName: r.createdBy.name, role: 'USER' } : null,
    projectId: r.project ? { _id: r.project.id, name: r.project.name } : null,
  }));

  res.json({
    stats: { total, open, inReview, answered, closed, overdue: 0 },
    recentRFIs: formattedRFIs,
    highPriorityRFIs: [],
    overdueRFIs: [],
  });
});

// GET /api/rfis/:id
const getRFIById = asyncHandler(async (req, res) => {
  const rfi = await rfiService.getRfiById(req.params.id, req.user);
  res.json({
    success: true,
    data: rfi,
  });
});

// POST /api/rfis
const createRFI = asyncHandler(async (req, res) => {
  const rfi = await rfiService.createRfi(req.body, req.user);
  res.status(201).json({
    success: true,
    data: rfi,
  });
});

// PATCH /api/rfis/:id
const updateRFI = asyncHandler(async (req, res) => {
  const rfi = await rfiService.updateRfi(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: rfi,
  });
});

// POST /api/rfis/:id/comments
const addComment = asyncHandler(async (req, res) => {
  const rfi = await rfiService.updateRfi(req.params.id, { answer: req.body.answer || req.body.comment }, req.user);
  res.json({
    success: true,
    data: rfi,
  });
});

// DELETE /api/rfis/:id
const deleteRFI = asyncHandler(async (req, res) => {
  await rfiService.deleteRfi(req.params.id, req.user);
  res.json({
    success: true,
    message: 'RFI deleted successfully',
  });
});

module.exports = {
  getRFIs,
  getRFIStats,
  getRFIById,
  createRFI,
  updateRFI,
  addComment,
  deleteRFI,
};
