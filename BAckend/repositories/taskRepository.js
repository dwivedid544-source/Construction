const Task = require('../models/Task');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class TaskRepository {
  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.task.findUnique({
        where: { id },
        include: { project: true, subTasks: true }
      });
    }
    return await Task.findById(id).populate('projectId assignedTo').lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return await prisma.task.findMany({
        where: { projectId },
        include: { subTasks: true },
        orderBy: { dueDate: 'asc' }
      });
    }
    return await Task.find({ projectId }).sort({ dueDate: 1 }).lean();
  }

  async create(taskData) {
    if (getDriver() === 'prisma') {
      return await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description || null,
          projectId: taskData.projectId,
          companyId: taskData.companyId,
          assignedToId: taskData.assignedToId || null,
          status: taskData.status || 'PENDING',
          priority: taskData.priority || 'MEDIUM',
          estimatedHours: taskData.estimatedHours || 0
        }
      });
    }
    return await Task.create(taskData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      return await prisma.task.update({
        where: { id },
        data: updateData
      });
    }
    return await Task.findByIdAndUpdate(id, updateData, { new: true });
  }
}

module.exports = new TaskRepository();
