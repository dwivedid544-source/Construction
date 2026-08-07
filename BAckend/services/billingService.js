/**
 * billingService.js — SaaS Subscription, Billing & Razorpay Integration Logic.
 */

'use strict';

const crypto = require('crypto');
const prisma = require('../config/prisma');
const { companyRepository, planRepository } = require('../repositories');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/auditLog');

class BillingService {
  /**
   * Get Razorpay credentials from environment.
   */
  getRazorpayConfig() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw AppError.internal('Razorpay credentials are not configured in environment.');
    }
    return { keyId, keySecret };
  }

  /**
   * Create a Razorpay payment order for plan subscription.
   */
  async createSubscriptionOrder(planId, user) {
    const plan = await planRepository.findByIdOrFail(planId, 'Subscription Plan');
    const { keyId, keySecret } = this.getRazorpayConfig();

    const amountInPaise = Math.round(plan.price * 100);
    const receipt = `rcpt_${user.companyId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    // If price is 0 (Free/Starter plan), handle auto-activation
    if (plan.price === 0) {
      await companyRepository.updateById(user.companyId, {
        subscriptionPlanId: plan.id,
        subscriptionStatus: 'active',
        maxProjects: plan.maxProjects,
        maxUsers: plan.maxUsers,
      });

      return {
        isFreePlan: true,
        message: 'Free plan activated successfully.',
      };
    }

    // Call Razorpay API using native fetch
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          companyId: user.companyId,
          planId: plan.id,
          userId: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw AppError.badRequest(errData.error?.description || 'Failed to create Razorpay order');
    }

    const orderData = await response.json();

    return {
      isFreePlan: false,
      keyId,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      planName: plan.name,
    };
  }

  /**
   * Verify Razorpay payment signature & update tenant subscription.
   */
  async verifyPaymentAndActivate(paymentData, user, req = null) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = paymentData;
    const { keySecret } = this.getRazorpayConfig();

    // Verify signature HMAC
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw AppError.badRequest('Invalid Razorpay payment signature.');
    }

    const plan = await planRepository.findByIdOrFail(planId, 'Subscription Plan');

    // Update Company tenant subscription limits
    const company = await companyRepository.updateById(user.companyId, {
      subscriptionPlanId: plan.id,
      subscriptionStatus: 'active',
      maxProjects: plan.maxProjects,
      maxUsers: plan.maxUsers,
    });

    // Record audit log
    await logAction({
      userId: user.id,
      companyId: user.companyId,
      action: 'SUBSCRIPTION_PURCHASE',
      resource: 'Company',
      resourceId: company.id,
      details: { planId: plan.id, razorpayOrderId, razorpayPaymentId, price: plan.price },
      req,
    });

    return {
      success: true,
      message: 'Subscription activated successfully.',
      company,
    };
  }

  /**
   * Get usage stats for tenant limits (projects used, seats used).
   */
  async getTenantUsageStats(companyId) {
    const company = await companyRepository.findByIdOrFail(companyId, 'Company');
    const [projectCount, userCount] = await Promise.all([
      prisma.project.count({ where: { companyId, deletedAt: null } }),
      prisma.user.count({ where: { companyId, role: { not: 'CLIENT' }, deletedAt: null } }),
    ]);

    return {
      companyId,
      subscriptionStatus: company.subscriptionStatus,
      projectsUsed: projectCount,
      maxProjects: company.maxProjects,
      usersUsed: userCount,
      maxUsers: company.maxUsers,
      hasProjectCapacity: projectCount < company.maxProjects,
      hasUserCapacity: userCount < company.maxUsers,
    };
  }
}

module.exports = new BillingService();
