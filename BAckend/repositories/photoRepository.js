'use strict';
/**
 * PhotoRepository — Photo data access.
 */
const Photo = require('../models/Photo');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class PhotoRepository extends BaseRepository {
  constructor() {
    super('photo', { softDelete: true, searchFields: ['caption', 'category'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return Photo.find({ projectId }).sort({ createdAt: -1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Photo.create(data);
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Photo.findByIdAndDelete(id);
  }
}

module.exports = new PhotoRepository();
