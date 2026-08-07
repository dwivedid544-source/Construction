/**
 * userService.js — User Management Business Logic.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { userRepository, companyRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class UserService {
  async getCompanyUsers(companyId, query = {}) {
    return userRepository.paginate(query, { companyId });
  }

  async getUserById(id, companyId = null) {
    const where = { id };
    if (companyId) where.companyId = companyId;
    return userRepository.findByIdOrFail(id, 'User');
  }

  async createUser(data, requestingUser) {
    const { email, fullName, role, phone, roleId, hourlyRate } = data;

    const existing = await userRepository.findByEmail(email);
    if (existing) throw AppError.conflict('Email is already registered.');

    // Check user limit for tenant
    if (requestingUser.companyId) {
      const company = await companyRepository.findById(requestingUser.companyId);
      const currentCount = await userRepository.count({ companyId: requestingUser.companyId });
      if (company && currentCount >= company.maxUsers) {
        throw AppError.forbidden(`Company user limit of ${company.maxUsers} reached. Please upgrade your plan.`);
      }
    }

    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    return userRepository.create({
      name: fullName,
      email: email.toLowerCase(),
      password: defaultPasswordHash,
      role: role || 'WORKER',
      roleId: roleId || null,
      phoneNumber: phone || null,
      hourlyRate: hourlyRate || 30,
      companyId: requestingUser.companyId,
      status: 'ACTIVE',
      isActive: true,
    });
  }

  async updateUser(id, updateData, requestingUser) {
    const user = await userRepository.findByIdOrFail(id, 'User');

    if (requestingUser.role !== 'SUPER_ADMIN' && user.companyId !== requestingUser.companyId) {
      throw AppError.forbidden('Access denied to this user.');
    }

    if (updateData.name || updateData.fullName) {
      updateData.name = updateData.fullName || updateData.name;
      delete updateData.fullName;
    }

    return userRepository.updateById(id, updateData);
  }

  async deleteUser(id, requestingUser) {
    const user = await userRepository.findByIdOrFail(id, 'User');

    if (requestingUser.role !== 'SUPER_ADMIN' && user.companyId !== requestingUser.companyId) {
      throw AppError.forbidden('Access denied to this user.');
    }

    return userRepository.softDeleteById(id);
  }
}

module.exports = new UserService();
