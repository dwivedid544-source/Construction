'use strict';
/**
 * PermissionRepository — Permission data access.
 */
const Permission = require('../models/Permission');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class PermissionRepository extends BaseRepository {
  constructor() {
    super('permission', { softDelete: false, searchFields: ['name', 'module', 'action'] });
  }

  async findAll() {
    if (getDriver() === 'prisma') return this.findMany({}, { orderBy: { module: 'asc' } });
    return Permission.find().sort({ module: 1 }).lean();
  }

  async findByModule(module) {
    if (getDriver() === 'prisma') return this.findMany({ module });
    return Permission.find({ module }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Permission.create(data);
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.hardDeleteById(id);
    return Permission.findByIdAndDelete(id);
  }
}

module.exports = new PermissionRepository();
