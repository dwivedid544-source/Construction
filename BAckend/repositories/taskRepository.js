const Task = require('../models/Task');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class TaskRepository {
  async findById(id) {
    if (getDriver() === 'prisma') {
      const t = await prisma.task.findUnique({
        where: { id },
        include: { project: true, subTasks: true },
      });
      if (!t) return null;
      return { ...t, _id: t.id };
    }
    return await Task.findById(id).populate('projectId assignedTo').lean();
  }

  async findByIdOrFail(id, entityName = 'Task') {
    const item = await this.findById(id);
    if (!item) {
      throw AppError.notFound(`${entityName} not found`);
    }
    return item;
  }

  async find(query = {}) {
    if (getDriver() === 'prisma') {
      const where = { deletedAt: null };
      if (query.projectId) where.projectId = query.projectId;
      if (query.companyId) where.companyId = query.companyId;
      if (query.assignedToId) where.assignedToId = query.assignedToId;
      if (query.status) where.status = query.status;

      const tasks = await prisma.task.findMany({
        where,
        include: { project: true, subTasks: true },
        orderBy: { dueDate: 'asc' },
      });
      return tasks.map((t) => ({ ...t, _id: t.id }));
    }
    return await Task.find({ ...query, deletedAt: null }).sort({ dueDate: 1 }).lean();
  }

  async findMany(query = {}) {
    return this.find(query);
  }

  async paginate(query = {}) {
    const tasks = await this.find(query);
    return {
      data: tasks,
      total: tasks.length,
      page: 1,
      limit: tasks.length,
    };
  }

  async findByProject(projectId) {
    return this.find({ projectId });
  }

  async count(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.task.count({ where: { ...query, deletedAt: null } });
    }
    return await Task.countDocuments({ ...query, deletedAt: null });
  }

  async create(taskData) {
    if (getDriver() === 'prisma') {
      const t = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description || null,
          projectId: taskData.projectId,
          companyId: taskData.companyId,
          assignedToId: taskData.assignedToId || null,
          status: taskData.status || 'PENDING',
          priority: taskData.priority || 'MEDIUM',
          estimatedHours: taskData.estimatedHours || 0,
        },
      });
      return { ...t, _id: t.id };
    }
    return await Task.create(taskData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      const t = await prisma.task.update({
        where: { id },
        data: updateData,
      });
      return { ...t, _id: t.id };
    }
    return await Task.findByIdAndUpdate(id, updateData, { new: true });
  }

  async softDeleteById(id) {
    if (getDriver() === 'prisma') {
      const t = await prisma.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { ...t, _id: t.id };
    }
    return await Task.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
  }

  async deleteById(id) {
    return this.softDeleteById(id);
  }
}

module.exports = new TaskRepository();
