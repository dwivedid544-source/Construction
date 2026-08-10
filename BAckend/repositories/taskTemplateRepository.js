'use strict';
/**
 * TaskTemplateRepository — Task template data access.
 */
const TaskTemplate = require('../models/TaskTemplate');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class TaskTemplateRepository extends BaseRepository {
  constructor() {
    super('taskTemplate', { softDelete: true, searchFields: ['name', 'category'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') return this.findMany({ companyId }, { orderBy: { name: 'asc' } });
    return TaskTemplate.find({ companyId }).sort({ name: 1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return TaskTemplate.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return TaskTemplate.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return TaskTemplate.findByIdAndDelete(id);
  }
}

module.exports = new TaskTemplateRepository();
