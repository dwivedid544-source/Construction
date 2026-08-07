/**
 * project.schema.js — Joi validation schemas for project routes.
 */
'use strict';

const Joi = require('joi');

const isoDate = Joi.string().isoDate().messages({
  'string.isoDate': '{{#label}} must be a valid ISO date (YYYY-MM-DD)',
});

// POST /api/projects
const createProject = Joi.object({
  name        : Joi.string().min(2).max(200).trim().required(),
  code        : Joi.string().max(20).trim().allow('', null),
  description : Joi.string().max(2000).allow('', null),
  pmId        : Joi.string().allow('', null),
  clientId    : Joi.string().allow('', null),
  status      : Joi.string().valid('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED').default('ACTIVE'),
  startDate   : isoDate.allow(null),
  endDate     : isoDate.allow(null),
  budget      : Joi.number().min(0).default(0),
  location    : Joi.string().max(500).allow('', null),
});

// PUT /api/projects/:id
const updateProject = Joi.object({
  name        : Joi.string().min(2).max(200).trim(),
  code        : Joi.string().max(20).trim().allow('', null),
  description : Joi.string().max(2000).allow('', null),
  pmId        : Joi.string().allow('', null),
  clientId    : Joi.string().allow('', null),
  status      : Joi.string().valid('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'),
  startDate   : isoDate.allow(null),
  endDate     : isoDate.allow(null),
  budget      : Joi.number().min(0),
  location    : Joi.string().max(500).allow('', null),
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// GET /api/projects  (query params)
const listProjects = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().valid('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().valid('name', 'createdAt', 'startDate', 'endDate', 'budget').default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = { createProject, updateProject, listProjects };
