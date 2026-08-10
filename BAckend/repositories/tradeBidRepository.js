'use strict';
/**
 * TradeBidRepository — Subcontractor trade bid data access.
 */
const TradeBid = require('../models/TradeBid');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class TradeBidRepository extends BaseRepository {
  constructor() {
    super('tradeBid', { softDelete: true, searchFields: ['trade', 'status'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: { subcontractor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return TradeBid.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return TradeBid.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return TradeBid.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return TradeBid.findByIdAndDelete(id);
  }
}

module.exports = new TradeBidRepository();
