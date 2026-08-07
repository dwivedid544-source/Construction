/**
 * companyController.js — Company & Dashboard Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const companyService = require('../services/companyService');
const { companyRepository } = require('../repositories');

// GET /api/companies/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await companyService.getDashboardStats(req.user.companyId);
  res.json({
    success: true,
    data: stats,
  });
});

// GET /api/companies
const getCompanies = asyncHandler(async (req, res) => {
  const result = await companyService.getCompanies(req.query);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/companies/:id
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  res.json({
    success: true,
    data: company,
  });
});

// POST /api/companies
const createCompany = asyncHandler(async (req, res) => {
  const company = await companyRepository.create(req.body);
  res.status(201).json({
    success: true,
    data: company,
  });
});

// PATCH /api/companies/:id
const updateCompany = asyncHandler(async (req, res) => {
  const updated = await companyService.updateCompany(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: updated,
  });
});

// DELETE /api/companies/:id
const deleteCompany = asyncHandler(async (req, res) => {
  await companyRepository.softDeleteById(req.params.id);
  res.json({
    success: true,
    message: 'Company deleted successfully',
  });
});

module.exports = {
  getDashboardStats,
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
