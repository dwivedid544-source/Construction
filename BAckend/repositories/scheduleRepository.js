'use strict';
/**
 * ScheduleRepository — Project schedule / Gantt data access.
 */
const Schedule = require('../models/Schedule');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class ScheduleRepository extends BaseRepository {
  constructor() {
    super('schedule', { softDelete: true, searchFields: ['title', 'status'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') return this.findMany({ projectId }, { orderBy: { startDate: 'asc' } });
    return Schedule.find({ projectId }).sort({ startDate: 1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Schedule.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Schedule.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Schedule.findByIdAndDelete(id);
  }
}

module.exports = new ScheduleRepository();
