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

const crypto = require('crypto');

// POST /api/billing/webhook
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(400).json({ success: false, message: 'Missing signature or webhook secret.' });
    }

    // Verify signature using raw body
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature.' });
    }

    const event = req.body;
    const eventId = req.headers['x-razorpay-event-id'] || event.created_at;

    const result = await billingService.processWebhookEvent(event, eventId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getUsageStats,
  handleWebhook,
};
