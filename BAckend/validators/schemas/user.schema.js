/**
 * user.schema.js — Joi validation schemas for user-management routes.
 */
'use strict';

const Joi = require('joi');

const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();
const phone = Joi.string().allow('', null);

const inviteUser = Joi.object({
  fullName    : Joi.string().min(1).max(100).trim().required(),
  email       : email.required(),
  role        : Joi.string().allow('', null).required(),
  phone       : phone,
  phoneNumber : phone,
  roleId      : Joi.string().allow('', null),
  hourlyRate  : Joi.any().allow('', null).default(30),
});

const updateUser = Joi.object({
  fullName    : Joi.string().min(1).max(100).trim(),
  phone       : phone,
  phoneNumber : phone,
  avatar      : Joi.string().allow('', null),
  role        : Joi.string().allow('', null),
  roleId      : Joi.string().allow('', null),
  isActive    : Joi.boolean(),
  status      : Joi.string().allow('', null),
  hourlyRate  : Joi.any().allow('', null),
  address     : Joi.string().max(500).allow('', null),
  province    : Joi.string().max(100).allow('', null),
}).min(1);

const listUsers = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  role      : Joi.string().allow('', null),
  isActive  : Joi.boolean(),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().allow('', null).default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

module.exports = { inviteUser, updateUser, listUsers };

