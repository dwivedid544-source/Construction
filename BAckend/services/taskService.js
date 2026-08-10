/**
 * taskService.js — Task & SubTask Business Logic.
 */

'use strict';

const { taskRepository, projectRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class TaskService {
  async getTasks(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return taskRepository.paginate(query, where);
  }

  async getTaskById(id, user) {
    const task = await taskRepository.findByIdOrFail(id, 'Task');
    if (user.role !== 'SUPER_ADMIN' && task.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this task.');
    }
    return task;
  }

  async createTask(data, user) {
    // Validate project ownership
    const project = await projectRepository.findByIdOrFail(data.projectId, 'Project');
    if (user.role !== 'SUPER_ADMIN' && project.companyId !== user.companyId) {
      throw AppError.forbidden('Cannot create task in a project owned by another company.');
    }

    return taskRepository.create({
      ...data,
      companyId: user.companyId,
      createdById: user.id,
    });
  }

  async updateTask(id, data, user) {
    const task = await this.getTaskById(id, user);
    return taskRepository.updateById(task.id, data);
  }

  async deleteTask(id, user) {
    const task = await this.getTaskById(id, user);
    return taskRepository.softDeleteById(task.id);
  }
}

module.exports = new TaskService();
