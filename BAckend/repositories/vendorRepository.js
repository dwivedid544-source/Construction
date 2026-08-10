'use strict';
/**
 * VendorRepository — Vendor data access.
 */
const Vendor = require('../models/Vendor');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class VendorRepository extends BaseRepository {
  constructor() {
    super('vendor', { softDelete: true, searchFields: ['name', 'contactPerson', 'email', 'trade'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') return this.findMany({ companyId }, { orderBy: { name: 'asc' } });
    return Vendor.find({ companyId }).sort({ name: 1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Vendor.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Vendor.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Vendor.findByIdAndDelete(id);
  }
}

module.exports = new VendorRepository();
