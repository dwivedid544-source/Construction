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
    const extractId = (val) => {
      if (!val) return null;
      if (Array.isArray(val)) {
        for (const item of val) {
          const res = extractId(item);
          if (res) return res;
        }
        return null;
      }
      if (typeof val === 'object') return val._id || val.id || null;
      if (typeof val === 'string') {
        if (val === '[object Object]' || val === 'undefined' || val === 'null' || !val.trim()) return null;
        return val.trim();
      }
      return String(val);
    };

    const companyId = extractId(data.companyId) || extractId(user.companyId);

    if (companyId) {
      const company = await companyRepository.findById(companyId);
      const currentCount = await projectRepository.count({ companyId });
      if (company && currentCount >= company.maxProjects) {
        throw AppError.forbidden(`Project limit of ${company.maxProjects} reached for your company plan.`);
      }
    }

    return projectRepository.create({
      ...data,
      companyId,
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
