/**
 * projectService.js — Project Management Business Logic.
 */

'use strict';

const { projectRepository, companyRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class ProjectService {
  async getProjects(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return projectRepository.paginate(query, where);
  }

  async getProjectById(id, user) {
    const project = await projectRepository.findByIdOrFail(id, 'Project');
    if (user.role !== 'SUPER_ADMIN' && project.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this project.');
    }
    return project;
  }

  async createProject(data, user) {
    if (user.companyId) {
      const company = await companyRepository.findById(user.companyId);
      const currentCount = await projectRepository.count({ companyId: user.companyId });
      if (company && currentCount >= company.maxProjects) {
        throw AppError.forbidden(`Project limit of ${company.maxProjects} reached for your company plan.`);
      }
    }

    return projectRepository.create({
      ...data,
      companyId: user.companyId,
    });
  }

  async updateProject(id, data, user) {
    const project = await this.getProjectById(id, user);
    return projectRepository.updateById(project.id, data);
  }

  async deleteProject(id, user) {
    const project = await this.getProjectById(id, user);
    return projectRepository.softDeleteById(project.id);
  }
}

module.exports = new ProjectService();
