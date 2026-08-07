/**
 * billingController.js — SaaS Subscription & Billing Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const billingService = require('../services/billingService');

// POST /api/billing/create-order
const createOrder = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const result = await billingService.createSubscriptionOrder(planId, req.user);
  res.json({
    success: true,
    data: result,
  });
});

// POST /api/billing/verify-payment
const verifyPayment = asyncHandler(async (req, res) => {
  const result = await billingService.verifyPaymentAndActivate(req.body, req.user, req);
  res.json({
    success: true,
    data: result,
  });
});

// GET /api/billing/usage
const getUsageStats = asyncHandler(async (req, res) => {
  const usage = await billingService.getTenantUsageStats(req.user.companyId);
  res.json({
    success: true,
    data: usage,
  });
});

module.exports = {
  createOrder,
  verifyPayment,
  getUsageStats,
};
