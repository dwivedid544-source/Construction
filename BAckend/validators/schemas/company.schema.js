/**
 * company.schema.js — Joi validation schemas for company routes.
 */
'use strict';

const Joi = require('joi');

const updateCompany = Joi.object({
  name               : Joi.string().min(1).max(100).trim(),
  email              : Joi.string().allow('', null),
  phone              : Joi.string().allow('', null),
  address            : Joi.string().max(500).allow('', null),
  subscriptionPlanId : Joi.string().allow('', null),
  subscriptionStatus : Joi.string().allow('', null),
  maxProjects        : Joi.number().integer().min(1).max(10000),
  maxUsers           : Joi.number().integer().min(1).max(100000),
}).min(1);

const listCompanies = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().allow('', null),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().allow('', null).default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

module.exports = { updateCompany, listCompanies };

