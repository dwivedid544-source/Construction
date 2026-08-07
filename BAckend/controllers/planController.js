/**
 * planController.js — Subscription Plan Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { planRepository } = require('../repositories');

// GET /api/plans
const getPlans = asyncHandler(async (req, res) => {
  const plans = await planRepository.findAll();
  const list = Array.isArray(plans) ? plans : (plans.data || []);
  res.json(list);
});

// POST /api/plans
const createPlan = asyncHandler(async (req, res) => {
  const plan = await planRepository.create(req.body);
  res.status(201).json({
    success: true,
    data: plan,
  });
});

// PATCH /api/plans/:id
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await planRepository.updateById(req.params.id, req.body);
  res.json({
    success: true,
    data: plan,
  });
});

// DELETE /api/plans/:id
const deletePlan = asyncHandler(async (req, res) => {
  await planRepository.deleteById(req.params.id);
  res.json({
    success: true,
    message: 'Subscription plan deleted',
  });
});

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
