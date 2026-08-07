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

      return {
        company,
        user: this.sanitizeUser(user),
        token,
      };
    });
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
