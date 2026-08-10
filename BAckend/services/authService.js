/**
 * authService.js — Authentication, Onboarding & User Credential Business Logic.
 */

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { userRepository, companyRepository, roleRepository } = require('../repositories');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/auditLog');

class AuthService {
  /**
   * Authenticate a user by email and password.
   */
  async login(email, password, req = null) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    if (user.isActive === false || user.status === 'INACTIVE') {
      throw AppError.forbidden('Your account is deactivated. Please contact support.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const token = this.generateToken(user);

    await logAction({
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
      req,
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Register a new multi-tenant Company and Owner (Company Onboarding).
   */
  async registerCompany(data, req = null) {
    const { companyName, fullName, email, password, phone, plan = 'starter' } = data;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw AppError.conflict('User with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.$transaction(async (tx) => {
      // Create Company
      const company = await companyRepository.create({
        name: companyName,
        email,
        phone,
        subscriptionStatus: 'active',
      });

      // Find or create default owner role
      let ownerRole = await roleRepository.findByName('COMPANY_OWNER');

      // Create Owner User
      const user = await userRepository.create({
        name: fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber: phone || null,
        role: 'COMPANY_OWNER',
        roleId: ownerRole?.id || null,
        companyId: company.id,
        status: 'ACTIVE',
        isActive: true,
      });

      const token = this.generateToken(user);

      await logAction({
        userId: user.id,
        companyId: company.id,
        action: 'REGISTER_COMPANY',
        resource: 'Company',
        resourceId: company.id,
        details: { companyName, plan },
        req,
      });

      // Dispatch welcome email via Brevo API
      const { sendWelcomeEmail } = require('../utils/emailService');
      sendWelcomeEmail({
        toEmail: user.email,
        toName: user.name || fullName,
        companyName: company.name,
        planName: plan || '7-Day Free Trial',
        expiryDate: '7 Days',
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
      }).catch((err) => console.error('[AuthService] Welcome email error:', err));

      return {
        company,
        user: this.sanitizeUser(user),
        token,
      };
    });
  }

  /**
   * Request a password reset email.
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return success to avoid user enumeration, but don't send email
      return { success: true, message: 'If that email exists, a reset link has been sent.' };
    }

    // Generate a stateless token containing userId and password hash signature
    const token = jwt.sign(
      { id: user.id, sig: user.password.slice(-10) },
      process.env.JWT_SECRET || 'kaal_construction_management_secret_key_2026',
      { expiresIn: '15m' }
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const { sendPasswordResetEmail } = require('../utils/emailService');
    await sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      resetUrl,
    });

    return { success: true, message: 'Password reset email sent.' };
  }

  /**
   * Reset password using a valid token.
   */
  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kaal_construction_management_secret_key_2026');
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        throw AppError.notFound('User not found.');
      }

      // Check if signature matches to prevent token reuse after password change
      if (user.password.slice(-10) !== decoded.sig) {
        throw AppError.badRequest('This token is invalid or has already been used.');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      return { success: true, message: 'Password has been reset successfully.' };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.badRequest('Token has expired.');
      }
      throw AppError.badRequest(err.message || 'Invalid token.');
    }
  }

  /**
   * Send OTP code for verification.
   */
  async sendOtp(email, user = null) {
    const targetEmail = email || user?.email;
    const targetName = user?.name || 'User';

    if (!targetEmail) {
      throw AppError.badRequest('Email is required.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { sendOtpEmail } = require('../utils/emailService');
    await sendOtpEmail({
      toEmail: targetEmail,
      toName: targetName,
      otpCode,
    });

    return { success: true, message: 'OTP sent successfully.', otp: otpCode };
  }

  /**
   * Generate JWT for user.
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
        companyId: user.companyId,
      },
      process.env.JWT_SECRET || 'kaal_construction_management_secret_key_2026',
      { expiresIn: '30d' }
    );
  }

  /**
   * Sanitize user object by stripping sensitive fields.
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new AuthService();
