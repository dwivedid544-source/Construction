'use strict';
/**
 * EstimateRepository — Estimate data access.
 */
const Estimate = require('../models/Estimate');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class EstimateRepository extends BaseRepository {
  constructor() {
    super('estimate', { softDelete: true, searchFields: ['estimateNumber', 'status'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') return this.findMany({ companyId }, { orderBy: { createdAt: 'desc' } });
    return Estimate.find({ companyId }).sort({ createdAt: -1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Estimate.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Estimate.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Estimate.findByIdAndDelete(id);
  }
}

module.exports = new EstimateRepository();
