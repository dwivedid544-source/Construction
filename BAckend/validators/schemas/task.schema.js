/**
 * task.schema.js — Joi validation schemas for task routes.
 */
'use strict';

const Joi = require('joi');

const flexibleDate = Joi.any().allow('', null);

const createTask = Joi.object({
  title          : Joi.string().min(1).max(300).trim().required(),
  description    : Joi.string().max(5000).allow('', null),
  projectId      : Joi.string().allow('', null),
  assignedToId   : Joi.string().allow('', null),
  status         : Joi.string().allow('', null).default('PENDING'),
  priority       : Joi.string().allow('', null).default('MEDIUM'),
  startDate      : flexibleDate,
  dueDate        : flexibleDate,
  estimatedHours : Joi.any().allow('', null).default(0),
});

const updateTask = Joi.object({
  title          : Joi.string().min(1).max(300).trim(),
  description    : Joi.string().max(5000).allow('', null),
  assignedToId   : Joi.string().allow('', null),
  status         : Joi.string().allow('', null),
  priority       : Joi.string().allow('', null),
  startDate      : flexibleDate,
  dueDate        : flexibleDate,
  estimatedHours : Joi.any().allow('', null),
  actualHours    : Joi.any().allow('', null),
}).min(1);

const listTasks = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().allow('', null),
  priority  : Joi.string().allow('', null),
  projectId : Joi.string().allow('', null),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().allow('', null).default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

const createSubTask = Joi.object({
  title        : Joi.string().min(1).max(300).trim().required(),
  assignedToId : Joi.string().allow('', null),
  dueDate      : flexibleDate,
  completed    : Joi.boolean().default(false),
});

module.exports = { createTask, updateTask, listTasks, createSubTask };

