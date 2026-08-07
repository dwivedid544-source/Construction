/**
 * user.schema.js — Joi validation schemas for user-management routes.
 */
'use strict';

const Joi = require('joi');

const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();
const phone = Joi.string().pattern(/^\d{10}$/).allow('', null);

const inviteUser = Joi.object({
  fullName    : Joi.string().min(2).max(100).trim().required(),
  email       : email.required(),
  role        : Joi.string().valid(
    'COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER',
    'CLIENT', 'SUBCONTRACTOR', 'ENGINEER'
  ).required(),
  phone       : phone,
  roleId      : Joi.string().allow('', null),
  hourlyRate  : Joi.number().min(0).max(9999).default(30),
});

const updateUser = Joi.object({
  fullName    : Joi.string().min(2).max(100).trim(),
  phone       : phone,
  avatar      : Joi.string().uri().allow('', null),
  role        : Joi.string().valid(
    'COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER',
    'CLIENT', 'SUBCONTRACTOR', 'ENGINEER'
  ),
  roleId      : Joi.string().allow('', null),
  isActive    : Joi.boolean(),
  hourlyRate  : Joi.number().min(0).max(9999),
  address     : Joi.string().max(255).allow('', null),
  province    : Joi.string().max(100).allow('', null),
}).min(1);

const listUsers = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  role      : Joi.string(),
  isActive  : Joi.boolean(),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().valid('name', 'email', 'createdAt', 'role').default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = { inviteUser, updateUser, listUsers };
