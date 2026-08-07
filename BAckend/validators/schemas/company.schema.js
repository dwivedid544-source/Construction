/**
 * company.schema.js — Joi validation schemas for company routes.
 */
'use strict';

const Joi = require('joi');

const updateCompany = Joi.object({
  name               : Joi.string().min(2).max(100).trim(),
  email              : Joi.string().email({ tlds: { allow: false } }).lowercase().trim().allow('', null),
  phone              : Joi.string().pattern(/^\d{10}$/).allow('', null),
  address            : Joi.string().max(500).allow('', null),
  subscriptionPlanId : Joi.string().allow('', null),
  subscriptionStatus : Joi.string().valid('active', 'inactive', 'trial', 'cancelled'),
  maxProjects        : Joi.number().integer().min(1).max(1000),
  maxUsers           : Joi.number().integer().min(1).max(10000),
}).min(1);

const listCompanies = Joi.object({
  page      : Joi.number().integer().min(1).default(1),
  limit     : Joi.number().integer().min(1).max(100).default(20),
  status    : Joi.string().valid('active', 'inactive', 'trial', 'cancelled'),
  q         : Joi.string().max(100).trim().allow(''),
  sortBy    : Joi.string().valid('name', 'createdAt').default('createdAt'),
  sortOrder : Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = { updateCompany, listCompanies };
