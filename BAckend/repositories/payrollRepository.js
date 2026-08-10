'use strict';
/**
 * PayrollRepository — Payroll data access.
 */
const Payroll = require('../models/Payroll');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class PayrollRepository extends BaseRepository {
  constructor() {
    super('payroll', { softDelete: true, searchFields: ['status'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: { worker: { select: { id: true, name: true } } },
        orderBy: { periodStart: 'desc' },
      });
    }
    return Payroll.find({ companyId }).sort({ periodStart: -1 }).lean();
  }

  async findByWorker(workerId) {
    if (getDriver() === 'prisma') return this.findMany({ workerId });
    return Payroll.find({ workerId: workerId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Payroll.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Payroll.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Payroll.findByIdAndDelete(id);
  }
}

module.exports = new PayrollRepository();
