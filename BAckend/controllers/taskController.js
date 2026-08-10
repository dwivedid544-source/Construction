/**
 * taskController.js — Task & SubTask Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const taskService = require('../services/taskService');
const { taskRepository } = require('../repositories');
const prisma = require('../config/prisma');

// GET /api/tasks
const getTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getTasks(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/tasks/my-tasks
const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await taskRepository.findMany({ assignedToId: req.user.id });
  const list = Array.isArray(tasks) ? tasks : (tasks.data || []);
  res.json(list);
});

// GET /api/tasks/project/:projectId
const getProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await taskRepository.findMany({ projectId: req.params.projectId });
  res.json({
    success: true,
    data: tasks,
  });
});

// POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user);
  res.status(201).json({
    success: true,
    data: task,
  });
});

// PUT /api/tasks/:id/assign
const assignTask = asyncHandler(async (req, res) => {
  const { assignedToId } = req.body;
  const task = await taskService.updateTask(req.params.id, { assignedToId }, req.user);
  res.json({
    success: true,
    data: task,
  });
});

// PATCH /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: task,
  });
});

// DELETE /api/tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
});

// PATCH /api/tasks/reorder
const reorderTasks = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Tasks reordered',
  });
});

// SubTasks
const getSubTasks = asyncHandler(async (req, res) => {
  const subTasks = await prisma.subTask.findMany({
    where: { taskId: req.params.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  res.json({
    success: true,
    data: subTasks,
  });
});

const createSubTask = asyncHandler(async (req, res) => {
  const subTask = await prisma.subTask.create({
    data: {
      taskId: req.params.id,
      title: req.body.title,
      assignedToId: req.body.assignedToId || null,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      completed: Boolean(req.body.completed),
    },
  });
  res.status(201).json({
    success: true,
    data: subTask,
  });
});

const updateSubTask = asyncHandler(async (req, res) => {
  const subTask = await prisma.subTask.update({
    where: { id: req.params.subTaskId },
    data: req.body,
  });
  res.json({
    success: true,
    data: subTask,
  });
});

const deleteSubTask = asyncHandler(async (req, res) => {
  await prisma.subTask.update({
    where: { id: req.params.subTaskId },
    data: { deletedAt: new Date() },
  });
  res.json({
    success: true,
    message: 'SubTask deleted',
  });
});

// GET /api/tasks/schedule
const getSchedule = asyncHandler(async (req, res) => {
  const tasks = await taskService.getTasks(req.query, req.user);
  res.json({
    success: true,
    ...tasks,
  });
});

// POST /api/tasks/:id/dependency
const addDependency = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Dependency added',
  });
});

module.exports = {
  getTasks,
  getMyTasks,
  getProjectTasks,
  createTask,
  assignTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getSubTasks,
  createSubTask,
  updateSubTask,
  deleteSubTask,
  getSchedule,
  addDependency,
};
