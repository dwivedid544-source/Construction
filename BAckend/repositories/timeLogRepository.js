'use strict';
/**
 * TimeLogRepository — Time log (clock-in/out) data access.
 */
const TimeLog = require('../models/TimeLog');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class TimeLogRepository extends BaseRepository {
  constructor() {
    super('timeLog', { softDelete: true, searchFields: ['notes'] });
  }

  async findByUser(userId) {
    if (getDriver() === 'prisma') return this.findMany({ userId }, { orderBy: { clockIn: 'desc' } });
    return TimeLog.find({ userId }).sort({ clockIn: -1 }).lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') return this.findMany({ projectId });
    return TimeLog.find({ projectId }).lean();
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: {
          user   : { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { clockIn: 'desc' },
      });
    }
    return TimeLog.find({ companyId }).sort({ clockIn: -1 }).lean();
  }

  async findActiveClockIn(userId) {
    if (getDriver() === 'prisma') return this.findOne({ userId, clockOut: null });
    return TimeLog.findOne({ userId, clockOut: null }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return TimeLog.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return TimeLog.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return TimeLog.findByIdAndDelete(id);
  }
}

module.exports = new TimeLogRepository();
