/**
 * project.schema.js — Joi validation schemas for project routes.
 */
'use strict';

const Joi = require('joi');

const flexibleDate = Joi.any().allow('', null);

// POST /api/projects
const createProject = Joi.object({
  name                : Joi.string().min(1).max(200).trim().required(),
  code                : Joi.string().max(50).trim().allow('', null),
  description         : Joi.string().max(2000).allow('', null),
  pmId                : Joi.any().allow('', null),
  pmIds               : Joi.any().allow('', null),
  clientId            : Joi.any().allow('', null),
  companyId           : Joi.any().allow('', null),
  status              : Joi.string().allow('', null).default('ACTIVE'),
  progress            : Joi.any().allow('', null),
  startDate           : flexibleDate,
  endDate             : flexibleDate,
  budget              : Joi.any().allow('', null).default(0),
  location            : Joi.any().allow('', null),
  siteLatitude        : Joi.any().allow('', null),
  siteLongitude       : Joi.any().allow('', null),
  allowedRadiusMeters : Joi.any().allow('', null),
  strictGeofence      : Joi.any().allow('', null),
  image               : Joi.any().allow('', null),
  imageFile           : Joi.any().allow('', null),
  imagePreview        : Joi.any().allow('', null),
});

// PUT /api/projects/:id
const updateProject = Joi.object({
  name                : Joi.string().min(1).max(200).trim(),
  code                : Joi.string().max(50).trim().allow('', null),
  description         : Joi.string().max(2000).allow('', null),
  pmId                : Joi.any().allow('', null),
  pmIds               : Joi.any().allow('', null),
  clientId            : Joi.any().allow('', null),
  companyId           : Joi.any().allow('', null),
  status              : Joi.string().allow('', null),
  progress            : Joi.any().allow('', null),
  startDate           : flexibleDate,
  endDate             : flexibleDate,
  budget              : Joi.any().allow('', null),
  location            : Joi.any().allow('', null),
  siteLatitude        : Joi.any().allow('', null),
  siteLongitude       : Joi.any().allow('', null),
  allowedRadiusMeters : Joi.any().allow('', null),
  strictGeofence      : Joi.any().allow('', null),
  image               : Joi.any().allow('', null),
  imageFile           : Joi.any().allow('', null),
  imagePreview        : Joi.any().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// GET /api/projects  (query params)
const listProjects = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().allow('', null),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().allow('', null).default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

module.exports = { createProject, updateProject, listProjects };

