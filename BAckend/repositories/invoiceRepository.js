'use strict';
/**
 * InvoiceRepository — Invoice data access.
 */
const Invoice = require('../models/Invoice');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class InvoiceRepository extends BaseRepository {
  constructor() {
    super('invoice', { softDelete: true, searchFields: ['invoiceNumber', 'status'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return Invoice.find({ companyId }).sort({ createdAt: -1 }).lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') return this.findMany({ projectId });
    return Invoice.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Invoice.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Invoice.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Invoice.findByIdAndDelete(id);
  }
}

module.exports = new InvoiceRepository();
