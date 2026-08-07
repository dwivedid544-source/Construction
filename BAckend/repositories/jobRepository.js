'use strict';
/**
 * JobRepository — Job / Work Order data access.
 */
const Job = require('../models/Job');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class JobRepository extends BaseRepository {
  constructor() {
    super('job', { softDelete: true, searchFields: ['title', 'clientName', 'status'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: {
          project: { select: { id: true, name: true } },
          jobWorkers: { include: { worker: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return Job.find({ companyId }).sort({ createdAt: -1 }).lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') return this.findMany({ projectId });
    return Job.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Job.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Job.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Job.findByIdAndDelete(id);
  }
}

module.exports = new JobRepository();
