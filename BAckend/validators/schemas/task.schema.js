/**
 * task.schema.js — Joi validation schemas for task routes.
 */
'use strict';

const Joi = require('joi');

const isoDate = Joi.string().isoDate().allow(null);

const createTask = Joi.object({
  title          : Joi.string().min(2).max(300).trim().required(),
  description    : Joi.string().max(5000).allow('', null),
  projectId      : Joi.string().required(),
  assignedToId   : Joi.string().allow('', null),
  status         : Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').default('PENDING'),
  priority       : Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  startDate      : isoDate,
  dueDate        : isoDate,
  estimatedHours : Joi.number().min(0).max(10000).default(0),
});

const updateTask = Joi.object({
  title          : Joi.string().min(2).max(300).trim(),
  description    : Joi.string().max(5000).allow('', null),
  assignedToId   : Joi.string().allow('', null),
  status         : Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
  priority       : Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  startDate      : isoDate,
  dueDate        : isoDate,
  estimatedHours : Joi.number().min(0).max(10000),
  actualHours    : Joi.number().min(0).max(10000),
}).min(1);

const listTasks = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
  priority  : Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  projectId : Joi.string(),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().valid('title', 'dueDate', 'priority', 'createdAt').default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc').default('desc'),
});

const createSubTask = Joi.object({
  title        : Joi.string().min(2).max(300).trim().required(),
  assignedToId : Joi.string().allow('', null),
  dueDate      : isoDate,
  completed    : Joi.boolean().default(false),
});

module.exports = { createTask, updateTask, listTasks, createSubTask };
