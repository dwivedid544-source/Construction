/**
 * authController.js — Authentication & User Management Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const userService = require('../services/userService');
const { userRepository, companyRepository } = require('../repositories');

// POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, req);
  const u = result.user || {};
  res.json({
    success: true,
    _id: u.id || u._id,
    id: u.id || u._id,
    name: u.name || u.fullName,
    fullName: u.name || u.fullName,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    token: result.token,
    user: u,
    ...u,
  });
});

// POST /api/auth/register-company
const registerCompany = asyncHandler(async (req, res) => {
  const result = await authService.registerCompany(req.body, req);
  const u = result.user || {};
  res.status(201).json({
    success: true,
    _id: u.id || u._id,
    id: u.id || u._id,
    name: u.name || u.fullName,
    fullName: u.name || u.fullName,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    token: result.token,
    user: u,
    company: result.company,
    ...u,
  });
});

// POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
  const result = await userService.createUser(req.body, { companyId: null });
  res.status(201).json({
    success: true,
    data: authService.sanitizeUser(result),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await userRepository.findByIdOrFail(req.user.id, 'User');
  const company = user.companyId ? await companyRepository.findById(user.companyId) : null;
  const sanitized = authService.sanitizeUser(user);
  const data = {
    ...sanitized,
    company: company ? { id: company.id, name: company.name } : { name: 'KT Construct' },
    companyName: company?.name || 'KT Construct',
  };
  res.json(data);
});

// GET /api/auth/users
const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getCompanyUsers(req.user.companyId, req.query);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// POST /api/auth/users
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user);
  res.status(201).json({
    success: true,
    data: authService.sanitizeUser(user),
  });
});

// PATCH /api/auth/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: authService.sanitizeUser(user),
  });
});

// DELETE /api/auth/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user);
  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

// PATCH /api/auth/updatepassword
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userRepository.findByIdOrFail(req.user.id, 'User');

  if (currentPassword) {
    const isMatch = await require('bcryptjs').compare(currentPassword, user.password);
    if (!isMatch) {
      throw require('../utils/AppError').badRequest('Current password is incorrect.');
    }
  }

  const hashedPassword = await require('bcryptjs').hash(newPassword, 10);
  await userRepository.updateById(user.id, { password: hashedPassword });

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

// PATCH /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };
  if (req.body.fullName) {
    updateData.name = req.body.fullName;
  }
  if (req.file) {
    updateData.avatar = req.file.path;
  }

  const updated = await userService.updateUser(req.user.id, updateData, req.user);
  const sanitized = authService.sanitizeUser(updated);
  res.json({
    success: true,
    data: sanitized,
    ...sanitized,
  });
});

// POST /api/auth/forgot-password
const forgotPasswordUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.json(result);
});

// POST /api/auth/reset-password
const resetPasswordUser = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.json(result);
});

// POST /api/auth/send-otp
const sendOtpUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.sendOtp(email, req.user);
  res.json(result);
});

// POST /api/auth/register-subscription
const registerSubscription = asyncHandler(async (req, res) => {
  const {
    companyName,
    city,
    email,
    phone,
    password,
    planName = 'Starter 1',
    price = '1.00',
    startDate,
    paymentId,
    razorpayOrderId,
    razorpaySignature,
  } = req.body;

  if (!email || !password || !companyName) {
    const AppError = require('../utils/AppError');
    throw AppError.badRequest('Company Name, Email, and Password are required.');
  }

  const cleanedPriceStr = String(price).replace(/[^0-9.]/g, '');
  const numericPrice = cleanedPriceStr ? parseFloat(cleanedPriceStr) : 0;
  const isPaidPlan = numericPrice > 0 && String(planName).toLowerCase().includes('free') === false;

  // 1. One-Time ₹1 / Starter Offer Protection (Email & Mobile Phone Number restriction)
  const isPromoStarterPlan = numericPrice <= 1.0 || String(planName).toLowerCase().includes('starter') || String(planName).toLowerCase().includes('free') || String(planName).toLowerCase().includes('trial');
  
  if (isPromoStarterPlan) {
    const prisma = require('../config/prisma');
    const existingUserOrCompany = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: email.toLowerCase() },
          ...(phone ? [{ phoneNumber: phone }] : []),
        ],
      },
    });

    if (existingUserOrCompany) {
      const AppError = require('../utils/AppError');
      throw AppError.badRequest(
        'This Email Address or Mobile Number has already been registered and claimed the 1-time ₹1 Starter offer. Multiple claims are not allowed. Please log in or select a standard subscription plan.'
      );
    }
  }

  // 2. Mandatory Backend Payment Verification for Paid Plans
  if (isPaidPlan) {
    if (!paymentId) {
      const AppError = require('../utils/AppError');
      throw AppError.badRequest('Payment ID is required for paid subscription plans.');
    }

    const billingService = require('../services/billingService');
    const expectedPaise = Math.round(numericPrice * 100);
    
    // Perform backend Razorpay API verification & signature check
    await billingService.verifyRazorpayPayment({
      paymentId,
      razorpayOrderId,
      razorpaySignature,
      expectedAmountPaise: expectedPaise,
    });
  }

  // 2. Create or register company + user
  let result;
  try {
    result = await authService.registerCompany({
      companyName,
      fullName: companyName,
      email,
      password,
      phone,
      plan: planName,
    }, req);
  } catch (err) {
    // If user already exists, authenticate user or return helpful message
    if (err.message && err.message.includes('already exists')) {
      const { userRepository } = require('../repositories');
      const user = await userRepository.findByEmail(email);
      const token = authService.generateToken(user);
      result = { user: authService.sanitizeUser(user), token };
    } else {
      throw err;
    }
  }

  // 3. Format start and expiry dates
  const start = startDate ? new Date(startDate) : new Date();
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const expiry = new Date(start);
  const durLower = String(planName).toLowerCase();
  if (durLower.includes('7 day') || durLower.includes('week')) {
    expiry.setDate(expiry.getDate() + 7);
  } else if (durLower.includes('year') || durLower.includes('annual')) {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  const expiryStr = expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // 4. Send custom KT Construct welcome activation email (only after verified backend payment)
  const { sendSubscriptionWelcomeEmail } = require('../utils/emailService');
  try {
    await sendSubscriptionWelcomeEmail({
      toEmail: email,
      companyName,
      plainPassword: password,
      planName,
      price: numericPrice > 0 ? numericPrice : price,
      duration: durLower.includes('7 day') ? '7 Days' : durLower.includes('year') ? 'Yearly' : 'Monthly',
      startDate: startStr,
      expiryDate: expiryStr,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
    });
    console.log(`[AuthController] Custom KT Construct activation email successfully sent to ${email}`);
  } catch (emailErr) {
    console.error('[AuthController] Error sending KT Construct activation email:', emailErr);
  }

  res.status(201).json({
    success: true,
    message: 'Backend payment verified successfully. Account activated and activation email sent!',
    user: result.user,
    token: result.token,
  });
});

// POST /api/auth/check-subscription-eligibility
const checkSubscriptionEligibility = asyncHandler(async (req, res) => {
  const { email, phone, planName = 'Starter 1', price = '1.00' } = req.body;

  if (!email) {
    const AppError = require('../utils/AppError');
    throw AppError.badRequest('Email Address is required.');
  }

  const cleanedPriceStr = String(price).replace(/[^0-9.]/g, '');
  const numericPrice = cleanedPriceStr ? parseFloat(cleanedPriceStr) : 0;
  const isPromoStarterPlan = numericPrice <= 1.0 || String(planName).toLowerCase().includes('starter') || String(planName).toLowerCase().includes('free') || String(planName).toLowerCase().includes('trial');

  const prisma = require('../config/prisma');

  // Check 1: Existing Active User or Mobile Number check (ignores deleted accounts for Super Admin re-testing)
  const existingUser = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: email.toLowerCase() },
        ...(phone ? [{ phoneNumber: phone }] : []),
      ],
    },
  });

  if (existingUser) {
    const AppError = require('../utils/AppError');
    if (isPromoStarterPlan) {
      throw AppError.badRequest(
        'This Email Address or Mobile Number has already been registered and claimed the 1-time ₹1 Starter offer. Multiple claims are not allowed. Please log in or select a standard subscription plan.'
      );
    } else {
      throw AppError.conflict('An account with this Email Address or Mobile Number already exists. Please log in to your portal.');
    }
  }

  // Check 2: Existing Active Company check by Email or Mobile Phone
  const existingCompany = await prisma.company.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: email.toLowerCase() },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existingCompany) {
    const AppError = require('../utils/AppError');
    throw AppError.badRequest(
      'An active company is already registered under this Email Address or Mobile Number. Please log in to manage your subscription.'
    );
  }

  res.json({
    success: true,
    eligible: true,
    message: 'Subscription eligibility verified. You may proceed to payment.',
  });
});

module.exports = {
  loginUser,
  registerUser,
  registerCompany,
  registerSubscription,
  checkSubscriptionEligibility,
  getMe,
  getUsers,
  updateUser,
  deleteUser,
  createUser,
  updatePassword,
  updateProfile,
  forgotPasswordUser,
  resetPasswordUser,
  sendOtpUser,
};
