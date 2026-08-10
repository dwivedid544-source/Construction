'use strict';
/**
 * PurchaseOrderRepository — Purchase Order data access.
 */
const PurchaseOrder = require('../models/purchaseOrder.model');
const prisma = require('../config/prisma');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class PurchaseOrderRepository extends BaseRepository {
  constructor() {
    super('purchaseOrder', { softDelete: true, searchFields: ['status'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: {
          vendor: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return PurchaseOrder.find({ companyId }).populate('vendorId projectId').sort({ createdAt: -1 }).lean();
  }

  async getNextPoNumber(companyId) {
    if (getDriver() === 'prisma') {
      const last = await prisma.purchaseOrder.findFirst({
        where: { companyId },
        orderBy: { poNumber: 'desc' },
      });
      return (last?.poNumber ?? 0) + 1;
    }
    const last = await PurchaseOrder.findOne({ companyId }).sort({ poNumber: -1 }).lean();
    return (last?.poNumber ?? 0) + 1;
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return PurchaseOrder.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return PurchaseOrder.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return PurchaseOrder.findByIdAndDelete(id);
  }
}

module.exports = new PurchaseOrderRepository();
