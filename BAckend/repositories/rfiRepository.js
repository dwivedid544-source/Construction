'use strict';
/**
 * RfiRepository — RFI (Request for Information) data access.
 */
const RFI = require('../models/RFI');
const prisma = require('../config/prisma');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class RfiRepository extends BaseRepository {
  constructor() {
    super('rFI', { softDelete: true, searchFields: ['title', 'question', 'answer'] });
  }

  async findByProject(projectId, opts = {}) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { number: 'asc' },
        ...opts,
      });
    }
    return RFI.find({ projectId }).sort({ number: 1 }).lean();
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') return this.findMany({ companyId });
    return RFI.find({ companyId }).lean();
  }

  async getNextNumber(projectId) {
    if (getDriver() === 'prisma') {
      const last = await prisma.rFI.findFirst({
        where: { projectId },
        orderBy: { number: 'desc' },
      });
      return (last?.number ?? 0) + 1;
    }
    const last = await RFI.findOne({ projectId }).sort({ number: -1 }).lean();
    return (last?.number ?? 0) + 1;
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return RFI.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return RFI.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return RFI.findByIdAndDelete(id);
  }
}

module.exports = new RfiRepository();
