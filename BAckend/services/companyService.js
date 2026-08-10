/**
 * companyService.js — Company & Tenant Business Logic.
 */

'use strict';

const { companyRepository, projectRepository, userRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class CompanyService {
  async getCompanies(query = {}) {
    return companyRepository.paginate(query);
  }

  async getCompanyById(id) {
    return companyRepository.findByIdOrFail(id, 'Company');
  }

  async updateCompany(id, data, requestingUser) {
    if (requestingUser.role !== 'SUPER_ADMIN' && requestingUser.companyId !== id) {
      throw AppError.forbidden('Access denied to update this company.');
    }
    return companyRepository.updateById(id, data);
  }

  async getDashboardStats(companyId) {
    const [projectCount, userCount] = await Promise.all([
      projectRepository.count({ companyId }),
      userRepository.count({ companyId }),
    ]);

    return {
      totalProjects: projectCount,
      totalUsers: userCount,
    };
  }
}

module.exports = new CompanyService();
