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

    // Persist order in DB to secure signature reconciliation later
    await prisma.subscriptionOrder.create({
      data: {
        orderId: orderData.id,
        companyId: user.companyId,
        planId: plan.id,
        userId: user.id,
        amountPaise: amountInPaise,
        currency: orderData.currency || 'INR',
        status: 'PENDING',
      }
    });

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

    let txResult;
    try {
      txResult = await prisma.$transaction(async (tx) => {
        // Verify against existing DB/Razorpay order details
        const dbOrder = await tx.subscriptionOrder.findUnique({
          where: { orderId: razorpayOrderId }
        });

        if (!dbOrder) {
          throw new Error('Razorpay order not found in our database.');
        }

        if (dbOrder.companyId !== user.companyId || dbOrder.planId !== planId) {
          throw new Error('Order details mismatch.');
        }

        const plan = await planRepository.findByIdOrFail(planId, 'Subscription Plan');
        const expectedAmountInPaise = Math.round(plan.price * 100);
        if (dbOrder.amountPaise !== expectedAmountInPaise) {
          throw new Error('Plan price mismatch.');
        }

        if (dbOrder.status === 'PAID') {
          return { alreadyPaid: true, planName: plan.name, planPrice: plan.price };
        }

        // Conditional update to prevent race conditions with webhook execution
        const updateResult = await tx.subscriptionOrder.updateMany({
          where: { id: dbOrder.id, status: 'PENDING' },
          data: { status: 'PAID' }
        });

        if (updateResult.count === 0) {
          throw new Error('Order already paid or processed.');
        }

        // Update Company tenant subscription limits
        const company = await companyRepository.updateById(user.companyId, {
          subscriptionPlanId: plan.id,
          subscriptionStatus: 'active',
          maxProjects: plan.maxProjects,
          maxUsers: plan.maxUsers,
        });

        return { success: true, company, planName: plan.name, planPrice: plan.price };
      });
    } catch (txErr) {
      throw AppError.badRequest(txErr.message || 'Payment verification failed.');
    }

    if (txResult.alreadyPaid) {
      const company = await companyRepository.findById(user.companyId);
      return {
        success: true,
        message: 'Subscription already active.',
        company
      };
    }

    // Record audit log
    await logAction({
      userId: user.id,
      companyId: user.companyId,
      action: 'SUBSCRIPTION_PURCHASE',
      resource: 'Company',
      resourceId: user.companyId,
      details: { planId, planName: txResult.planName, paymentId: razorpayPaymentId },
      req,
    });

    // Send email activation via Brevo API outside the transaction
    const { sendSubscriptionWelcomeEmail } = require('../utils/emailService');
    const start = new Date();
    const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + (String(txResult.planName).toLowerCase().includes('7 days') ? 7 : 30));
    const expiryStr = expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    sendSubscriptionWelcomeEmail({
      toEmail: user.email,
      companyName: txResult.company?.name || user.name || 'Valued Customer',
      plainPassword: 'Saved during registration',
      planName: txResult.planName,
      price: txResult.planPrice,
      duration: String(txResult.planName).toLowerCase().includes('7 days') ? '7 Days' : 'Monthly',
      startDate: startStr,
      expiryDate: expiryStr,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
    }).catch((err) => console.error('[BillingService] Subscription activation email error:', err));

    return {
      success: true,
      message: 'Subscription activated successfully.',
      company: txResult.company,
    };
  }

  /**
   * Get usage stats for tenant limits (projects used, seats used).
   */
  async getTenantUsageStats(companyId) {
    const company = await companyRepository.findByIdOrFail(companyId, 'Company');
    const [projectCount, userCount] = await Promise.all([
      prisma.project.count({ where: { companyId, deletedAt: null } }),
      prisma.user.count({ where: { companyId, role: { isNot: { name: 'CLIENT' } }, deletedAt: null } }),
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
  async processWebhookEvent(event, eventId) {
    let eventRecord;
    try {
      eventRecord = await prisma.processedWebhookEvent.create({
        data: { eventId, status: 'PROCESSING' }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        const existing = await prisma.processedWebhookEvent.findUnique({
          where: { eventId }
        });
        if (existing) {
          if (existing.status === 'PROCESSED') {
            console.log(`[Webhook] Event ${eventId} already processed. Skipping duplicate.`);
            return { duplicate: true };
          }
          if (existing.status === 'PROCESSING') {
            // Check for stale PROCESSING state (longer than 5 minutes) for crash recovery
            const staleTime = 5 * 60 * 1000;
            const isStale = (Date.now() - new Date(existing.updatedAt).getTime()) > staleTime;
            if (!isStale) {
              console.log(`[Webhook] Event ${eventId} is currently being processed. Skipping duplicate.`);
              return { duplicate: true };
            }
            console.warn(`[Webhook] Event ${eventId} was stuck in PROCESSING since ${existing.updatedAt}. Recovering and retrying...`);
            eventRecord = await prisma.processedWebhookEvent.update({
              where: { id: existing.id },
              data: { status: 'PROCESSING' }
            });
          } else if (existing.status === 'FAILED') {
            // Allow retrying failed webhook execution
            eventRecord = await prisma.processedWebhookEvent.update({
              where: { id: existing.id },
              data: { status: 'PROCESSING' }
            });
          }
        }
      } else {
        throw err;
      }
    }

    const eventName = event.event;
    const payload = event.payload?.payment?.entity;

    if (!payload) {
      if (eventRecord) {
        await prisma.processedWebhookEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'FAILED' }
        });
      }
      return { success: false, reason: 'Invalid payload structure' };
    }

    console.log(`[Webhook] Processing event: ${eventName}, payment ID: ${payload.id}`);

    if (eventName === 'payment.captured') {
      const orderId = payload.order_id;
      let txResult;

      try {
        txResult = await prisma.$transaction(async (tx) => {
          // Find corresponding database subscription order inside the transaction
          const dbOrder = await tx.subscriptionOrder.findUnique({
            where: { orderId }
          });

          if (!dbOrder) {
            throw new Error('Order not found');
          }

          // If already processed, skip activation
          if (dbOrder.status === 'PAID') {
            return { alreadyPaid: true, companyId: dbOrder.companyId };
          }

          const notes = payload.notes || {};
          const webhookCompanyId = notes.companyId || dbOrder.companyId;
          const webhookPlanId = notes.planId || dbOrder.planId;
          const webhookUserId = notes.userId || dbOrder.userId;

          // Strict validation of webhook values against original database order details
          if (
            dbOrder.companyId !== webhookCompanyId ||
            dbOrder.planId !== webhookPlanId ||
            dbOrder.amountPaise !== payload.amount ||
            dbOrder.currency.toUpperCase() !== payload.currency.toUpperCase() ||
            payload.status !== 'captured'
          ) {
            throw new Error('Reconciliation details mismatch');
          }

          const user = await tx.user.findUnique({ where: { id: webhookUserId } });
          const plan = await tx.plan.findUnique({ where: { id: webhookPlanId } });

          if (!user || !plan) {
            throw new Error('Associated User or Plan not found');
          }

          // Conditional update to prevent race conditions with simultaneous browser callback
          const updateResult = await tx.subscriptionOrder.updateMany({
            where: { id: dbOrder.id, status: 'PENDING' },
            data: { status: 'PAID' }
          });

          if (updateResult.count === 0) {
            throw new Error('Order already paid or processed');
          }

          // Update company subscription limits inside transaction
          await tx.company.update({
            where: { id: dbOrder.companyId },
            data: {
              subscriptionPlanId: plan.id,
              subscriptionStatus: 'active',
              maxProjects: plan.maxProjects,
              maxUsers: plan.maxUsers,
            }
          });

          // Mark webhook event status as PROCESSED inside transaction
          await tx.processedWebhookEvent.update({
            where: { id: eventRecord.id },
            data: { status: 'PROCESSED' }
          });

          return {
            success: true,
            action: 'activated',
            companyId: dbOrder.companyId,
            userEmail: user.email,
            userName: user.name || user.fullName,
            planName: plan.name,
            planPrice: plan.price,
            paymentId: payload.id
          };
        });
      } catch (txErr) {
        // If the transaction fails, update the event status to FAILED so it remains retryable
        await prisma.processedWebhookEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'FAILED' }
        });
        console.warn(`[Webhook] Transaction failed for order ${orderId}:`, txErr.message);
        return { success: false, reason: txErr.message };
      }

      if (txResult.alreadyPaid) {
        // Mark webhook event status as PROCESSED if order was already paid
        await prisma.processedWebhookEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'PROCESSED' }
        });
        return { success: true, action: 'already_paid', companyId: txResult.companyId };
      }

      // Dispatch mail outside the transaction so it cannot cause a database rollback
      if (txResult.success) {
        const { sendPaymentSuccessEmail } = require('../utils/emailService');
        sendPaymentSuccessEmail({
          toEmail: txResult.userEmail,
          toName: txResult.userName,
          amount: txResult.planPrice,
          planName: txResult.planName,
          paymentId: txResult.paymentId,
        }).catch((err) => console.error('[Webhook] Success email sending error:', err));

        return { success: true, action: 'activated', companyId: txResult.companyId };
      }
    } else if (eventName === 'payment.failed') {
      console.log(`[Webhook] Payment failed event received for order: ${payload.order_id}`);
      await prisma.processedWebhookEvent.update({
        where: { id: eventRecord.id },
        data: { status: 'PROCESSED' }
      });
      return { success: true, action: 'logged_failure' };
    }

    // Mark unhandled webhook events as processed
    if (eventRecord) {
      await prisma.processedWebhookEvent.update({
        where: { id: eventRecord.id },
        data: { status: 'PROCESSED' }
      });
    }
    return { success: true, action: 'unhandled_event' };
  }
}

module.exports = new BillingService();
