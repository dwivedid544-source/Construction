/**
 * rfi.schema.js — Joi validation schemas for RFI routes.
 */
'use strict';

const Joi = require('joi');

const createRfi = Joi.object({
  title        : Joi.string().min(2).max(300).trim().required(),
  question     : Joi.string().min(10).max(5000).required(),
  assignedToId : Joi.string().allow('', null),
  status       : Joi.string().valid('OPEN', 'ANSWERED', 'CLOSED').default('OPEN'),
});

const updateRfi = Joi.object({
  title        : Joi.string().min(2).max(300).trim(),
  question     : Joi.string().min(10).max(5000),
  answer       : Joi.string().max(5000).allow('', null),
  assignedToId : Joi.string().allow('', null),
  status       : Joi.string().valid('OPEN', 'ANSWERED', 'CLOSED'),
}).min(1);

module.exports = { createRfi, updateRfi };
