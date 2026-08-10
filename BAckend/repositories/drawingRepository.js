'use strict';
/**
 * DrawingRepository — Drawing + Annotation data access.
 */
const Drawing = require('../models/Drawing');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class DrawingRepository extends BaseRepository {
  constructor() {
    super('drawing', { softDelete: true, searchFields: ['title', 'version'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: {
          uploadedBy: { select: { id: true, name: true } },
          annotations: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return Drawing.find({ projectId }).sort({ createdAt: -1 }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Drawing.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Drawing.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Drawing.findByIdAndDelete(id);
  }
}

module.exports = new DrawingRepository();
