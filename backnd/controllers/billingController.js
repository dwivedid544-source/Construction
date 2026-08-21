/**
 * billingController.js — Razorpay Payment Gateway & Subscription Lifecycle Engine
 */

'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../config/prisma');
const { sendPaymentSuccessEmail, sendSubscriptionWelcomeEmail } = require('../utils/emailService');

const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured.');
    }

    return new Razorpay({ key_id, key_secret });
};

/**
 * @desc    Create a Razorpay order for plan subscription
 * @route   POST /api/billing/create-order
 * @access  Private (Authenticated users)
 */
const createOrder = async (req, res, next) => {
    try {
        const { planId } = req.body;
        const user = req.user;

        if (!user.companyId) {
            res.status(400);
            throw new Error('User does not belong to a company');
        }

        let plan = null;
        if (planId) {
            const mongoose = require('mongoose');
            if (mongoose.isValidObjectId(planId)) {
                plan = await prisma.plan.findUnique({ where: { id: planId } });
            }
            if (!plan) {
                plan = await prisma.plan.findFirst({
                    where: { name: { contains: String(planId), mode: 'insensitive' } }
                });
            }
        }

        if (!plan) {
            plan = await prisma.plan.findFirst({ orderBy: { price: 'asc' } });
        }

        if (!plan) {
            res.status(404);
            throw new Error('Subscription plan not found');
        }

        // Auto-activate ₹0 free plans
        if (Number(plan.price) === 0) {
            const startDate = new Date();
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 7); // 7-day free trial

            await prisma.company.update({
                where: { id: user.companyId },
                data: {
                    subscriptionPlanId: plan.id,
                    subscriptionStatus: 'active',
                    startDate,
                    expireDate
                }
            });

            // Trigger welcome email
            const company = await prisma.company.findUnique({ where: { id: user.companyId } });
            sendSubscriptionWelcomeEmail({
                toEmail: user.email,
                companyName: company ? company.name : user.fullName,
                planName: plan.name,
                price: '0.00',
                duration: '7 Days Trial',
                startDate,
                expiryDate: expireDate
            }).catch(e => console.error('[Billing] Free plan email error:', e.message));

            return res.json({
                success: true,
                data: {
                    isFreePlan: true,
                    message: 'Free trial plan activated successfully!',
                    planName: plan.name
                }
            });
        }

        const razorpay = getRazorpayInstance();
        const amountPaise = Math.round(Number(plan.price) * 100);
        const receipt = `rcpt_${String(user.companyId).slice(-6)}_${Date.now().toString().slice(-6)}`;

        const orderOptions = {
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes: {
                companyId: String(user.companyId),
                planId: String(plan.id),
                userId: String(user.id)
            }
        };

        console.log('[Billing] Creating Razorpay order with options:', orderOptions);
        const order = await razorpay.orders.create(orderOptions);

        // Store order in MongoDB for later reconciliation
        try {
            await prisma.subscriptionOrder.create({
                data: {
                    orderId: order.id,
                    companyId: user.companyId,
                    planId: plan.id,
                    userId: user.id,
                    amountPaise,
                    currency: order.currency || 'INR',
                    status: 'PENDING',
                    notes: order.notes
                }
            });
        } catch (dbErr) {
            console.warn('[Billing] Note: Could not save subscriptionOrder record:', dbErr.message);
        }

        res.json({
            success: true,
            data: {
                isFreePlan: false,
                keyId: process.env.RAZORPAY_KEY_ID,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                planName: plan.name
            }
        });
    } catch (error) {
        console.error('[Billing] createOrder error:', error);
        next(error);
    }
};

/**
 * @desc    Verify Razorpay payment signature & activate subscription
 * @route   POST /api/billing/verify-payment
 * @access  Private
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;
        const user = req.user;
        const secret = process.env.RAZORPAY_KEY_SECRET;

        if (!secret) {
            res.status(500);
            throw new Error('Razorpay key secret is not configured.');
        }

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            res.status(400);
            throw new Error('Missing payment verification details.');
        }

        // HMAC SHA256 Signature Verification
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            console.error('[Billing] Razorpay Signature Mismatch:', {
                generated: generatedSignature,
                received: razorpaySignature
            });
            res.status(400);
            throw new Error('Payment signature verification failed.');
        }

        console.log('[Billing] ✅ Payment signature verified for order:', razorpayOrderId);

        // Fetch plan details
        let plan = null;
        if (planId) {
            plan = await prisma.plan.findUnique({ where: { id: planId } });
        }
        if (!plan) {
            plan = await prisma.plan.findFirst({ orderBy: { price: 'desc' } });
        }

        const now = new Date();
        const duration = plan && plan.period === 'year' ? 365 : 30;
        const expireDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

        // Update Company subscription
        const updatedCompany = await prisma.company.update({
            where: { id: user.companyId },
            data: {
                subscriptionStatus: 'active',
                subscriptionPlanId: plan ? plan.id : undefined,
                startDate: now,
                expireDate
            }
        });

        // Update SubscriptionOrder record
        try {
            await prisma.subscriptionOrder.update({
                where: { orderId: razorpayOrderId },
                data: {
                    status: 'PAID',
                    paymentId: razorpayPaymentId,
                    signature: razorpaySignature
                }
            });
        } catch (e) {
            // Ignore if order record was not saved
        }

        // Log transaction
        try {
            await prisma.transaction.create({
                data: {
                    companyId: user.companyId,
                    amount: plan ? Number(plan.price) : 599,
                    currency: 'INR',
                    status: 'paid',
                    type: 'subscription',
                    paymentMethod: 'razorpay',
                    metadata: {
                        razorpayOrderId,
                        razorpayPaymentId,
                        planId: plan ? plan.id : null,
                        planName: plan ? plan.name : 'Standard'
                    }
                }
            });
        } catch (e) {
            console.warn('[Billing] Transaction record log warning:', e.message);
        }

        // Dispatch Brevo Emails
        const companyName = updatedCompany ? updatedCompany.name : user.fullName;
        const planName = plan ? plan.name : 'Active Plan';
        const price = plan ? plan.price : 599;

        sendPaymentSuccessEmail({
            toEmail: user.email,
            companyName,
            planName,
            amount: price * 100,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            expiryDate
        }).catch(err => console.error('[Billing] Brevo payment email error:', err.message));

        sendSubscriptionWelcomeEmail({
            toEmail: user.email,
            companyName,
            planName,
            price,
            duration: duration === 365 ? 'Yearly' : 'Monthly',
            startDate: now,
            expiryDate
        }).catch(err => console.error('[Billing] Brevo welcome email error:', err.message));

        res.json({
            success: true,
            message: 'Payment verified and subscription activated successfully!',
            data: {
                subscriptionStatus: 'active',
                planName,
                expireDate
            }
        });
    } catch (error) {
        console.error('[Billing] verifyPayment error:', error);
        next(error);
    }
};

/**
 * @desc    Get billing and transaction history for current company
 * @route   GET /api/billing/history
 * @access  Private
 */
const getBillingHistory = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const transactions = await prisma.transaction.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Handle Razorpay Webhook Events
 * @route   POST /api/billing/webhook
 * @access  Public (Webhook verification)
 */
const handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        if (webhookSecret && signature) {
            const shasum = crypto.createHmac('sha256', webhookSecret);
            shasum.update(JSON.stringify(req.body));
            const digest = shasum.digest('hex');

            if (digest !== signature) {
                console.warn('[Billing Webhook] Invalid webhook signature received');
                return res.status(400).json({ status: 'invalid_signature' });
            }
        }

        const event = req.body.event;
        console.log(`[Billing Webhook] Event received: ${event}`);

        if (event === 'payment.captured' || event === 'order.paid') {
            const payment = req.body.payload?.payment?.entity;
            const notes = payment?.notes || {};
            if (notes.companyId) {
                await prisma.company.update({
                    where: { id: notes.companyId },
                    data: { subscriptionStatus: 'active' }
                });
            }
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('[Billing Webhook] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getBillingHistory,
    handleWebhook
};
