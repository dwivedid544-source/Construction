'use strict';
/**
 * PlanRepository — Subscription plan data access.
 */
const Plan = require('../models/Plan');
const prisma = require('../config/prisma');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class PlanRepository extends BaseRepository {
  constructor() {
    super('plan', { softDelete: true, searchFields: ['name'] });
  }

  async findByName(name) {
    if (getDriver() === 'prisma') return this.findOne({ name });
    return Plan.findOne({ name }).lean();
  }

  async findAll() {
    if (getDriver() === 'prisma') return this.findMany({}, { orderBy: { price: 'asc' } });
    return Plan.find().sort({ price: 1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Plan.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Plan.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Plan.findByIdAndDelete(id);
  }
}

module.exports = new PlanRepository();
