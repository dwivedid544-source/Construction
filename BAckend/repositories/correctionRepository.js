'use strict';
/**
 * CorrectionRepository — Correction Request data access.
 */
const CorrectionRequest = require('../models/CorrectionRequest');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class CorrectionRepository extends BaseRepository {
  constructor() {
    super('correctionRequest', { softDelete: true, searchFields: ['description', 'itemType', 'status'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: { requestedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return CorrectionRequest.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return CorrectionRequest.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return CorrectionRequest.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return CorrectionRequest.findByIdAndDelete(id);
  }
}

module.exports = new CorrectionRepository();
