'use strict';
/**
 * EquipmentRepository — Equipment data access.
 */
const Equipment = require('../models/Equipment');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class EquipmentRepository extends BaseRepository {
  constructor() {
    super('equipment', { softDelete: true, searchFields: ['name', 'serialNumber', 'category'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') return this.findMany({ companyId }, { orderBy: { name: 'asc' } });
    return Equipment.find({ companyId }).sort({ name: 1 }).lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') return this.findMany({ projectId });
    return Equipment.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Equipment.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Equipment.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Equipment.findByIdAndDelete(id);
  }
}

module.exports = new EquipmentRepository();
