/**
 * dailyLog.schema.js — Joi validation schemas for daily log routes.
 */
'use strict';

const Joi = require('joi');

const createDailyLog = Joi.object({
  projectId   : Joi.string().required(),
  logDate     : Joi.string().isoDate().default(() => new Date().toISOString()),
  weather     : Joi.string().max(100).allow('', null),
  notes       : Joi.string().max(5000).allow('', null),
  workerCount : Joi.number().integer().min(0).default(0),
});

const updateDailyLog = Joi.object({
  logDate     : Joi.string().isoDate(),
  weather     : Joi.string().max(100).allow('', null),
  notes       : Joi.string().max(5000).allow('', null),
  workerCount : Joi.number().integer().min(0),
  approved    : Joi.boolean(),
}).min(1);

module.exports = { createDailyLog, updateDailyLog };
