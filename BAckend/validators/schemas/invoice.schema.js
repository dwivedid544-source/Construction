/**
 * invoice.schema.js — Joi validation schemas for invoice routes.
 */
'use strict';

const Joi = require('joi');

const invoiceItem = Joi.object({
  description : Joi.string().max(500).required(),
  quantity    : Joi.number().min(0).default(1),
  unitPrice   : Joi.number().min(0).required(),
  total       : Joi.number().min(0),
});

const createInvoice = Joi.object({
  projectId     : Joi.string().allow('', null),
  clientId      : Joi.string().allow('', null),
  amount        : Joi.number().min(0).default(0),
  dueDate       : Joi.string().isoDate().required(),
  status        : Joi.string().valid('PENDING', 'PAID', 'OVERDUE', 'CANCELLED').default('PENDING'),
  items         : Joi.array().items(invoiceItem).default([]),
});

const updateInvoice = Joi.object({
  amount  : Joi.number().min(0),
  dueDate : Joi.string().isoDate(),
  status  : Joi.string().valid('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'),
  items   : Joi.array().items(invoiceItem),
}).min(1);

module.exports = { createInvoice, updateInvoice };
