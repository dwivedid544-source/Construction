/**
 * job.schema.js — Joi validation schemas for job routes.
 */
'use strict';

const Joi = require('joi');

const createJob = Joi.object({
  title      : Joi.string().min(2).max(200).trim().required(),
  projectId  : Joi.string().allow('', null),
  clientName : Joi.string().max(200).trim().allow('', null),
  status     : Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED').default('IN_PROGRESS'),
});

const updateJob = Joi.object({
  title      : Joi.string().min(2).max(200).trim(),
  projectId  : Joi.string().allow('', null),
  clientName : Joi.string().max(200).trim().allow('', null),
  status     : Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
}).min(1);

const listJobs = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().valid('title', 'createdAt', 'status').default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = { createJob, updateJob, listJobs };
