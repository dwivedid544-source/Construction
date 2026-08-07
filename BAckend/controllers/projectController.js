/**
 * projectController.js — Project Management Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const projectService = require('../services/projectService');
const { projectRepository, userRepository } = require('../repositories');
const prisma = require('../config/prisma');

// GET /api/projects
const getProjects = asyncHandler(async (req, res) => {
  const result = await projectService.getProjects(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/projects/:id
const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user);
  res.json({
    success: true,
    data: project,
  });
});

// POST /api/projects
const createProject = asyncHandler(async (req, res) => {
  const projectData = { ...req.body };
  if (req.file) {
    projectData.image = req.file.path;
  }

  const project = await projectService.createProject(projectData, req.user);
  res.status(201).json({
    success: true,
    data: project,
  });
});

// PATCH /api/projects/:id
const updateProject = asyncHandler(async (req, res) => {
  const projectData = { ...req.body };
  if (req.file) {
    projectData.image = req.file.path;
  }

  const project = await projectService.updateProject(req.params.id, projectData, req.user);
  res.json({
    success: true,
    data: project,
  });
});

// DELETE /api/projects/:id
const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Project archived successfully',
  });
});

// GET /api/projects/:id/members
const getProjectMembers = asyncHandler(async (req, res) => {
  const members = await userRepository.findMany({ companyId: req.user.companyId });
  res.json({
    success: true,
    data: members,
  });
});

// GET /api/projects/:id/client-progress
const getClientProgress = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user);
  res.json({
    success: true,
    data: {
      projectId: project.id,
      progress: project.progress || 0,
      status: project.status,
    },
  });
});

// GET /api/projects/:id/client-updates
const getProjectClientUpdates = asyncHandler(async (req, res) => {
  const updates = await prisma.projectUpdate.findMany({
    where: { projectId: req.params.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: updates,
  });
});

// POST /api/projects/:id/client-updates
const createProjectClientUpdate = asyncHandler(async (req, res) => {
  const { title, summary } = req.body;
  const update = await prisma.projectUpdate.create({
    data: {
      projectId: req.params.id,
      title: title || 'Client Update',
      summary: summary || '',
    },
  });
  res.status(201).json({
    success: true,
    data: update,
  });
});

// GET /api/projects/:id/financial-summary
const getProjectFinancialSummary = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user);
  res.json({
    success: true,
    data: {
      budget: project.budget || 0,
      expenses: 0,
      balance: project.budget || 0,
    },
  });
});

// GET /api/projects/archived
const getArchivedProjects = asyncHandler(async (req, res) => {
  const archived = await prisma.project.findMany({
    where: {
      companyId: req.user.companyId,
      deletedAt: { not: null },
    },
  });
  res.json({
    success: true,
    data: archived,
  });
});

// PATCH /api/projects/:id/restore
const restoreProject = asyncHandler(async (req, res) => {
  const restored = await projectRepository.restoreById(req.params.id);
  res.json({
    success: true,
    data: restored,
  });
});

// DELETE /api/projects/:id/permanent
const permanentlyDeleteProject = asyncHandler(async (req, res) => {
  await projectRepository.hardDeleteById(req.params.id);
  res.json({
    success: true,
    message: 'Project permanently deleted',
  });
});

// POST /api/projects/reorder
const reorderProjects = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Projects reordered',
  });
});

// Project Notes
const getProjectNotes = asyncHandler(async (req, res) => {
  const notes = await prisma.projectNote.findMany({
    where: { projectId: req.params.id, deletedAt: null },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: notes,
  });
});

const createProjectNote = asyncHandler(async (req, res) => {
  const note = await prisma.projectNote.create({
    data: {
      projectId: req.params.id,
      authorId: req.user.id,
      content: req.body.content,
    },
  });
  res.status(201).json({
    success: true,
    data: note,
  });
});

const updateProjectNote = asyncHandler(async (req, res) => {
  const note = await prisma.projectNote.update({
    where: { id: req.params.noteId },
    data: { content: req.body.content },
  });
  res.json({
    success: true,
    data: note,
  });
});

const deleteProjectNote = asyncHandler(async (req, res) => {
  await prisma.projectNote.update({
    where: { id: req.params.noteId },
    data: { deletedAt: new Date() },
  });
  res.json({
    success: true,
    message: 'Project note deleted',
  });
});

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  getClientProgress,
  getProjectClientUpdates,
  createProjectClientUpdate,
  getProjectFinancialSummary,
  getArchivedProjects,
  restoreProject,
  permanentlyDeleteProject,
  reorderProjects,
  getProjectNotes,
  createProjectNote,
  deleteProjectNote,
  updateProjectNote,
};
