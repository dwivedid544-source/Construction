/**
 * vendor.schema.js — Joi validation schemas for vendor routes.
 */
'use strict';

const Joi = require('joi');

const createVendor = Joi.object({
  name          : Joi.string().min(1).max(200).trim().required(),
  contactPerson : Joi.string().max(100).trim().allow('', null),
  email         : Joi.string().allow('', null),
  phone         : Joi.string().allow('', null),
  trade         : Joi.string().max(100).trim().allow('', null),
  taxId         : Joi.string().max(50).allow('', null),
});

const updateVendor = Joi.object({
  name          : Joi.string().min(1).max(200).trim(),
  contactPerson : Joi.string().max(100).trim().allow('', null),
  email         : Joi.string().allow('', null),
  phone         : Joi.string().allow('', null),
  trade         : Joi.string().max(100).trim().allow('', null),
  taxId         : Joi.string().max(50).allow('', null),
}).min(1);

module.exports = { createVendor, updateVendor };

