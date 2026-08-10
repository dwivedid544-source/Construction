const Project = require('../models/Project');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class ProjectRepository {
  async findById(id) {
    if (getDriver() === 'prisma') {
      const p = await prisma.project.findUnique({
        where: { id },
        include: { company: true, projectManager: true, client: true }
      });
      if (!p) return null;
      return { ...p, _id: p.id };
    }
    return await Project.findById(id).populate('pmId clientId companyId').lean();
  }

  async findByIdOrFail(id, entityName = 'Project') {
    const item = await this.findById(id);
    if (!item) {
      throw AppError.notFound(`${entityName} not found`);
    }
    return item;
  }

  async find(query = {}, additionalWhere = {}) {
    if (getDriver() === 'prisma') {
      const where = { deletedAt: null, ...additionalWhere };
      if (query.companyId) where.companyId = query.companyId;
      if (query.clientId) where.clientId = query.clientId;
      if (query.status && query.status.$ne) {
        where.status = { not: query.status.$ne };
      } else if (query.status) {
        where.status = query.status;
      }
      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      return projects.map(p => ({ ...p, _id: p.id }));
    }
    return await Project.find({ ...query, deletedAt: null })
      .select('name status pmIds pmId clientId createdAt budget currentPhase location siteLatitude siteLongitude progress image startDate endDate sortOrder')
      .populate('clientId', 'fullName email')
      .populate('pmIds', 'fullName email')
      .populate('pmId', 'fullName email')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async findMany(query = {}, options = {}) {
    return this.find(query, options);
  }

  async paginate(query = {}, additionalWhere = {}) {
    const projects = await this.find(query, additionalWhere);
    return {
      data: projects,
      total: projects.length,
      page: 1,
      limit: projects.length
    };
  }

  async findByCompany(companyId, filter = {}) {
    if (getDriver() === 'prisma') {
      const projects = await prisma.project.findMany({
        where: { companyId, deletedAt: null, ...filter },
        orderBy: { createdAt: 'desc' }
      });
      return projects.map(p => ({ ...p, _id: p.id }));
    }
    return await Project.find({ companyId, deletedAt: null, ...filter }).sort({ createdAt: -1 }).lean();
  }

  async count(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.project.count({ where: { ...query, deletedAt: null } });
    }
    return await Project.countDocuments({ ...query, deletedAt: null });
  }

  async countDocuments(query = {}) {
    return this.count(query);
  }

  async create(projectData) {
    if (getDriver() === 'prisma') {
      const budgetNum = typeof projectData.budget === 'number' ? projectData.budget : (parseFloat(String(projectData.budget).replace(/[^0-9.]/g, '')) || 0);
      let statusStr = String(projectData.status || 'ACTIVE').toUpperCase();
      if (statusStr === 'PLANNING') statusStr = 'ACTIVE';
      if (statusStr === 'ACTIVE SITE') statusStr = 'ACTIVE';
      if (!['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].includes(statusStr)) statusStr = 'ACTIVE';

      const locStr = typeof projectData.location === 'object' ? JSON.stringify(projectData.location) : (projectData.location || null);

      let targetPmId = projectData.pmId || null;
      if (!targetPmId && projectData.pmIds) {
        try {
          const parsed = typeof projectData.pmIds === 'string' ? JSON.parse(projectData.pmIds) : projectData.pmIds;
          if (Array.isArray(parsed) && parsed.length > 0) {
            targetPmId = typeof parsed[0] === 'object' ? parsed[0]._id || parsed[0].id : parsed[0];
          }
        } catch (e) {}
      }

      let targetClientId = projectData.clientId || null;
      if (typeof targetClientId === 'object' && targetClientId !== null) {
        targetClientId = targetClientId._id || targetClientId.id || null;
      }

      const p = await prisma.project.create({
        data: {
          name: projectData.name,
          code: projectData.code || null,
          description: projectData.description || null,
          companyId: projectData.companyId,
          pmId: targetPmId || null,
          clientId: targetClientId || null,
          status: statusStr,
          budget: budgetNum,
          location: locStr
        }
      });
      return { ...p, _id: p.id };
    }
    return await Project.create(projectData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      const sanitized = { ...updateData };
      if (sanitized.budget !== undefined) {
        sanitized.budget = typeof sanitized.budget === 'number' ? sanitized.budget : (parseFloat(String(sanitized.budget).replace(/[^0-9.]/g, '')) || 0);
      }
      if (sanitized.status) {
        let s = String(sanitized.status).toUpperCase();
        if (s === 'PLANNING' || s === 'ACTIVE SITE') s = 'ACTIVE';
        if (['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].includes(s)) {
          sanitized.status = s;
        } else {
          delete sanitized.status;
        }
      }
      if (sanitized.location && typeof sanitized.location === 'object') {
        sanitized.location = JSON.stringify(sanitized.location);
      }
      delete sanitized._id;
      delete sanitized.pmIds;
      delete sanitized.imageFile;

      const p = await prisma.project.update({
        where: { id },
        data: sanitized
      });
      return { ...p, _id: p.id };
    }
    return await Project.findByIdAndUpdate(id, updateData, { new: true });
  }

  async softDeleteById(id) {
    if (getDriver() === 'prisma') {
      const p = await prisma.project.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      return { ...p, _id: p.id };
    }
    return await Project.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
  }

  async deleteById(id) {
    return this.softDeleteById(id);
  }
}

module.exports = new ProjectRepository();
