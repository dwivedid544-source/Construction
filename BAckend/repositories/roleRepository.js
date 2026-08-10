'use strict';
/**
 * RoleRepository — Role data access.
 */
const Role = require('../models/Role');
const prisma = require('../config/prisma');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class RoleRepository extends BaseRepository {
  constructor() {
    super('role', { softDelete: false, searchFields: ['name', 'description'] });
  }

  async findByName(name) {
    if (getDriver() === 'prisma') return this.findOne({ name });
    return Role.findOne({ name }).lean();
  }

  async findAll() {
    if (getDriver() === 'prisma') return this.findMany({}, { include: { permissions: { include: { permission: true } } } });
    return Role.find().lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Role.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Role.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.hardDeleteById(id);
    return Role.findByIdAndDelete(id);
  }
}

module.exports = new RoleRepository();
