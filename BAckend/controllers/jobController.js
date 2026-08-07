/**
 * jobController.js — Job & Work Order Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const jobService = require('../services/jobService');
const { jobRepository } = require('../repositories');
const prisma = require('../config/prisma');

// GET /api/jobs
const getJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getJobs(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/jobs/:id
const getJobById = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id, req.user);
  res.json({
    success: true,
    data: job,
  });
});

// POST /api/jobs
const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.body, req.user);
  res.status(201).json({
    success: true,
    data: job,
  });
});

// PATCH /api/jobs/:id
const updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: job,
  });
});

// DELETE /api/jobs/:id
const deleteJob = asyncHandler(async (req, res) => {
  await jobService.deleteJob(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Job deleted successfully',
  });
});

// GET /api/jobs/:id/full-history
const getJobFullHistory = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id, req.user);
  res.json({
    success: true,
    data: {
      job,
      activityLogs: [],
      notes: [],
    },
  });
});

// GET /api/jobs/:id/history-pdf
const generateJobHistoryPDF = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'PDF generation feature stub',
  });
});

// Job Notes
const getJobNotes = asyncHandler(async (req, res) => {
  const notes = await prisma.jobNote.findMany({
    where: { jobId: req.params.id, deletedAt: null },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: notes,
  });
});

const createJobNote = asyncHandler(async (req, res) => {
  const note = await prisma.jobNote.create({
    data: {
      jobId: req.params.id,
      authorId: req.user.id,
      content: req.body.content,
    },
  });
  res.status(201).json({
    success: true,
    data: note,
  });
});

const deleteJobNote = asyncHandler(async (req, res) => {
  await prisma.jobNote.update({
    where: { id: req.params.noteId },
    data: { deletedAt: new Date() },
  });
  res.json({
    success: true,
    message: 'Job note removed',
  });
});

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobFullHistory,
  generateJobHistoryPDF,
  getJobNotes,
  createJobNote,
  deleteJobNote,
};
