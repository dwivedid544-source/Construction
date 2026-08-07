/**
 * dailyLogController.js — Daily Site Log Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const dailyLogService = require('../services/dailyLogService');

// GET /api/dailylogs
const getDailyLogs = asyncHandler(async (req, res) => {
  const result = await dailyLogService.getDailyLogs(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/dailylogs/reports
const getDailyLogReports = asyncHandler(async (req, res) => {
  const logs = await dailyLogService.getDailyLogs(req.query, req.user);
  const list = Array.isArray(logs) ? logs : (logs.data || []);
  res.json(list);
});

// POST /api/dailylogs
const createDailyLog = asyncHandler(async (req, res) => {
  const dailyLog = await dailyLogService.createDailyLog(req.body, req.user);
  res.status(201).json({
    success: true,
    data: dailyLog,
  });
});

// PATCH /api/dailylogs/:id
const updateDailyLog = asyncHandler(async (req, res) => {
  const dailyLog = await dailyLogService.updateDailyLog(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: dailyLog,
  });
});

// POST /api/dailylogs/:id/verify
const verifyDailyLog = asyncHandler(async (req, res) => {
  const dailyLog = await dailyLogService.updateDailyLog(req.params.id, { approved: true }, req.user);
  res.json({
    success: true,
    data: dailyLog,
  });
});

// DELETE /api/dailylogs/:id
const deleteDailyLog = asyncHandler(async (req, res) => {
  await dailyLogService.deleteDailyLog(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Daily log deleted successfully',
  });
});

module.exports = {
  getDailyLogs,
  createDailyLog,
  verifyDailyLog,
  updateDailyLog,
  deleteDailyLog,
  getDailyLogReports,
};
