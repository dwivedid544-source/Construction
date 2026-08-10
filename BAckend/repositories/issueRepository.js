'use strict';
/**
 * IssueRepository — Issue data access.
 */
const Issue = require('../models/Issue');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class IssueRepository extends BaseRepository {
  constructor() {
    super('issue', { softDelete: true, searchFields: ['title', 'description'] });
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ projectId }, {
        include: {
          reportedBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });
    }
    return Issue.find({ projectId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Issue.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return Issue.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Issue.findByIdAndDelete(id);
  }
}

module.exports = new IssueRepository();
