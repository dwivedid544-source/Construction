/**
 * vendorService.js — Vendor & Subcontractor Trade Business Logic.
 */

'use strict';

const { vendorRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class VendorService {
  async getVendors(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return vendorRepository.paginate(query, where);
  }

  async getVendorById(id, user) {
    const vendor = await vendorRepository.findByIdOrFail(id, 'Vendor');
    if (user.role !== 'SUPER_ADMIN' && vendor.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this vendor.');
    }
    return vendor;
  }

  async createVendor(data, user) {
    return vendorRepository.create({
      ...data,
      companyId: user.companyId,
    });
  }

  async updateVendor(id, data, user) {
    const vendor = await this.getVendorById(id, user);
    return vendorRepository.updateById(vendor.id, data);
  }

  async deleteVendor(id, user) {
    const vendor = await this.getVendorById(id, user);
    return vendorRepository.softDeleteById(vendor.id);
  }
}

module.exports = new VendorService();
