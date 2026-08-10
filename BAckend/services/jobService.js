/**
 * jobService.js — Job & Work Order Business Logic.
 */

'use strict';

const { jobRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class JobService {
  async getJobs(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return jobRepository.paginate(query, where);
  }

  async getJobById(id, user) {
    const job = await jobRepository.findByIdOrFail(id, 'Job');
    if (user.role !== 'SUPER_ADMIN' && job.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this job.');
    }
    return job;
  }

  async createJob(data, user) {
    return jobRepository.create({
      ...data,
      companyId: user.companyId,
      createdById: user.id,
    });
  }

  async updateJob(id, data, user) {
    const job = await this.getJobById(id, user);
    return jobRepository.updateById(job.id, data);
  }

  async deleteJob(id, user) {
    const job = await this.getJobById(id, user);
    return jobRepository.softDeleteById(job.id);
  }
}

module.exports = new JobService();
