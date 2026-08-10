'use strict';
/**
 * TodoRepository — Todo data access.
 */
const Todo = require('../models/Todo');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class TodoRepository extends BaseRepository {
  constructor() {
    super('todo', { softDelete: true, searchFields: ['title'] });
  }

  async findByUser(userId) {
    if (getDriver() === 'prisma') return this.findMany({ userId }, { orderBy: { createdAt: 'desc' } });
    return Todo.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Todo.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Todo.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Todo.findByIdAndDelete(id);
  }
}

module.exports = new TodoRepository();
