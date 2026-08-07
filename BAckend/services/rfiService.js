/**
 * rfiService.js — Request For Information (RFI) Business Logic.
 */

'use strict';

const { rfiRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class RfiService {
  async getRfis(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return rfiRepository.paginate(query, where);
  }

  async getRfiById(id, user) {
    const rfi = await rfiRepository.findByIdOrFail(id, 'RFI');
    if (user.role !== 'SUPER_ADMIN' && rfi.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this RFI.');
    }
    return rfi;
  }

  async createRfi(data, user) {
    const nextNumber = await rfiRepository.getNextNumber(data.projectId);
    return rfiRepository.create({
      ...data,
      number: nextNumber,
      companyId: user.companyId,
      createdById: user.id,
    });
  }

  async updateRfi(id, data, user) {
    const rfi = await this.getRfiById(id, user);
    return rfiRepository.updateById(rfi.id, data);
  }

  async deleteRfi(id, user) {
    const rfi = await this.getRfiById(id, user);
    return rfiRepository.softDeleteById(rfi.id);
  }
}

module.exports = new RfiService();
