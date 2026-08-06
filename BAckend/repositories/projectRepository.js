const Project = require('../models/Project');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class ProjectRepository {
  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.project.findUnique({
        where: { id },
        include: { company: true, projectManager: true, client: true }
      });
    }
    return await Project.findById(id).populate('pmId clientId companyId').lean();
  }

  async find(query = {}) {
    if (getDriver() === 'prisma') {
      const where = {};
      if (query.companyId) where.companyId = query.companyId;
      if (query.clientId) where.clientId = query.clientId;
      if (query.status && query.status.$ne) {
        where.status = { not: query.status.$ne };
      } else if (query.status) {
        where.status = query.status;
      }
      return await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    }
    return await Project.find(query)
      .select('name status pmIds pmId clientId createdAt budget currentPhase location siteLatitude siteLongitude progress image startDate endDate sortOrder')
      .populate('clientId', 'fullName email')
      .populate('pmIds', 'fullName email')
      .populate('pmId', 'fullName email')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async findByCompany(companyId, filter = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.project.findMany({
        where: { companyId, ...filter },
        orderBy: { createdAt: 'desc' }
      });
    }
    return await Project.find({ companyId, ...filter }).sort({ createdAt: -1 }).lean();
  }

  async create(projectData) {
    if (getDriver() === 'prisma') {
      return await prisma.project.create({
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
    }
    return await Project.create(projectData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      return await prisma.project.update({
        where: { id },
        data: updateData
      });
    }
    return await Project.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.project.delete({
        where: { id }
      });
    }
    return await Project.findByIdAndDelete(id);
  }

  async countDocuments(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.project.count({ where: query });
    }
    return await Project.countDocuments(query);
  }
}

module.exports = new ProjectRepository();
