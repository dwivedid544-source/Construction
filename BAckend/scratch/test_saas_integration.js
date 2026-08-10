/**
 * test_saas_integration.js — Script to programmatically test Brevo and Razorpay integration.
 */
'use strict';

require('dotenv').config();
const prisma = require('../config/prisma');
const billingService = require('../services/billingService');
const authService = require('../services/authService');
const { sendWelcomeEmail, sendPasswordResetEmail, sendOtpEmail } = require('../utils/emailService');

async function testWelcomeEmail() {
  console.log('\n--- 1. Testing Welcome Email ---');
  try {
    const res = await sendWelcomeEmail({
      toEmail: 'dwivedid544@gmail.com',
      toName: 'Test Owner',
      companyName: 'Kiaan Tech Corp',
      planName: 'Starter 599',
      expiryDate: 'Next Month',
      loginUrl: 'http://localhost:5173/login'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testPasswordResetEmail() {
  console.log('\n--- 2. Testing Password Reset Email ---');
  try {
    const res = await sendPasswordResetEmail({
      toEmail: 'dwivedid544@gmail.com',
      toName: 'Test Owner',
      resetUrl: 'http://localhost:5173/reset-password?token=mocktoken123'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testOtpEmail() {
  console.log('\n--- 3. Testing OTP Email ---');
  try {
    const res = await sendOtpEmail({
      toEmail: 'dwivedid544@gmail.com',
      toName: 'Test Owner',
      otpCode: '852963'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testRazorpayOrderAndVerification() {
  console.log('\n--- 4. Testing Razorpay Order & Verify Flow ---');
  try {
    // Get a test plan
    const plan = await prisma.plan.findFirst({
      where: { price: { gt: 0 } }
    });
    if (!plan) {
      console.warn('No paid subscription plans found in DB. Skip.');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: 'admin@gmail.com' }
    });
    if (!user) {
      console.warn('No user with admin@gmail.com found. Skip.');
      return;
    }

    console.log(`Creating order for plan: ${plan.name} (price: ₹${plan.price})`);
    const order = await billingService.createSubscriptionOrder(plan.id, user);
    console.log('Order created successfully:', order);

    console.log('Simulating successful verification of a mock payment...');
    const crypto = require('crypto');
    const mockOrderId = order.orderId || 'order_mock123';
    const mockPaymentId = 'pay_mock123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
    
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${mockOrderId}|${mockPaymentId}`)
      .digest('hex');

    const activation = await billingService.verifyPaymentAndActivate({
      razorpayOrderId: mockOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: signature,
      planId: plan.id
    }, user);

    console.log('Verify & Activate Response:', activation);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function testWebhookFlow() {
  console.log('\n--- 5. Testing Razorpay Webhook Event Flow ---');
  try {
    const plan = await prisma.plan.findFirst();
    const user = await prisma.user.findFirst({ where: { email: 'admin@gmail.com' } });
    if (!plan || !user) {
      console.warn('Skip webhook test: plan or user not found.');
      return;
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret; // Set if missing for local testing

    // Pre-create the subscription order in DB to verify webhook reconciliation
    const testOrderId = 'order_test_123_' + Date.now();
    await prisma.subscriptionOrder.create({
      data: {
        orderId: testOrderId,
        companyId: user.companyId,
        planId: plan.id,
        userId: user.id,
        amountPaise: Math.round(plan.price * 100),
        currency: 'INR',
        status: 'PENDING'
      }
    });

    const eventPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test_' + Date.now(),
            order_id: testOrderId,
            amount: plan.price * 100,
            currency: 'INR',
            status: 'captured',
            notes: {
              companyId: user.companyId,
              planId: plan.id,
              userId: user.id
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(eventPayload);
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    console.log('Testing processing with valid signature and event ID...');
    const eventId = 'evt_' + Date.now();
    const result = await billingService.processWebhookEvent(eventPayload, eventId);
    console.log('First process result:', result);

    console.log('Testing processing of duplicate event ID (should be skipped)...');
    const duplicateResult = await billingService.processWebhookEvent(eventPayload, eventId);
    console.log('Duplicate process result (should have duplicate: true):', duplicateResult);

  } catch (err) {
    console.error('Error in webhook test:', err.message);
  }
}

async function run() {
  await testWelcomeEmail();
  await testPasswordResetEmail();
  await testOtpEmail();
  await testRazorpayOrderAndVerification();
  await testWebhookFlow();
  process.exit(0);
}

run();
