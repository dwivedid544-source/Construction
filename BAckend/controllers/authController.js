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
  } = req.body;

  if (!email || !password || !companyName) {
    const AppError = require('../utils/AppError');
    throw AppError.badRequest('Company Name, Email, and Password are required.');
  }

  // Create or register company + user
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

  // Format dates
  const start = startDate ? new Date(startDate) : new Date();
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + (String(planName).toLowerCase().includes('7 days') ? 7 : 30));
  const expiryStr = expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Send activation email
  const { sendSubscriptionWelcomeEmail } = require('../utils/emailService');
  sendSubscriptionWelcomeEmail({
    toEmail: email,
    companyName,
    plainPassword: password,
    planName,
    price,
    duration: String(planName).toLowerCase().includes('7 days') ? '7 Days' : 'Monthly',
    startDate: startStr,
    expiryDate: expiryStr,
    loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
  }).catch(err => console.error('[AuthController] sendSubscriptionWelcomeEmail error:', err));

  res.status(201).json({
    success: true,
    message: 'Subscription registered and activation email sent!',
    user: result.user,
    token: result.token,
  });
});

module.exports = {
  loginUser,
  registerUser,
  registerCompany,
  registerSubscription,
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
