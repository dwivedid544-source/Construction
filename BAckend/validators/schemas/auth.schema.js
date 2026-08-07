/**
 * auth.schema.js — Joi validation schemas for authentication routes.
 */
'use strict';

const Joi = require('joi');

const password = Joi.string().min(6).max(128).messages({
  'string.min': 'Password must be at least 6 characters',
});

const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();
const phone = Joi.string().max(20).allow('', null);

// POST /api/auth/register-company
const registerCompany = Joi.object({
  companyName : Joi.string().min(2).max(100).trim().required(),
  fullName    : Joi.string().min(2).max(100).trim().required(),
  email       : email.required(),
  password    : password.required(),
  phone       : phone,
  plan        : Joi.string().allow('', null).default('starter'),
});

// POST /api/auth/login
const login = Joi.object({
  email    : email.required(),
  password : Joi.string().required(),
});

// PUT /api/auth/profile
const updateProfile = Joi.object({
  fullName    : Joi.string().min(2).max(100).trim(),
  phone       : phone.optional().allow('', null),
  avatar      : Joi.string().uri().allow('', null),
  address     : Joi.string().max(255).allow('', null),
  province    : Joi.string().max(100).allow('', null),
  hourlyRate  : Joi.number().min(0).max(9999),
});

// POST /api/auth/change-password
const changePassword = Joi.object({
  currentPassword : Joi.string().required(),
  newPassword     : password.required(),
});

// POST /api/auth/forgot-password
const forgotPassword = Joi.object({
  email: email.required(),
});

// POST /api/auth/reset-password
const resetPassword = Joi.object({
  token       : Joi.string().required(),
  newPassword : password.required(),
});

module.exports = {
  registerCompany,
  login,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
