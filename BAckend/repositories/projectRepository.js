const Project = require('../models/Project');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

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
}

module.exports = new ProjectRepository();
