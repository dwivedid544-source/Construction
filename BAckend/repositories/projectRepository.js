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
      const p = await prisma.project.create({
        data: {
          name: projectData.name,
          code: projectData.code || null,
          description: projectData.description || null,
          companyId: projectData.companyId,
          pmId: projectData.pmId || null,
          clientId: projectData.clientId || null,
          status: projectData.status || 'ACTIVE',
          budget: projectData.budget || 0,
          location: projectData.location || null
        }
      });
      return { ...p, _id: p.id };
    }
    return await Project.create(projectData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      const p = await prisma.project.update({
        where: { id },
        data: updateData
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
