/**
 * planController.js — Subscription Plan Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { planRepository } = require('../repositories');

// GET /api/plans
const getPlans = asyncHandler(async (req, res) => {
  let plans = await planRepository.findAll();
  let list = Array.isArray(plans) ? plans : (plans?.data || []);

  if (!list || list.length === 0) {
    const defaultPlans = [
      {
        name: 'Free Try Now 7 Days',
        price: 0,
        period: '7 Days',
        maxProjects: 1,
        maxUsers: 3,
        isPopular: false,
        features: [
          '1 Active Construction Project',
          '3 Team Members / Field Engineers',
          'Daily Site Logs & Task Management',
          'Basic Subcontractor RFQ Requests',
          'Purchase Orders & Invoice Creation',
          'Document & Blueprint Vault (500 MB)',
          'Full 7-Day Unrestricted Access',
        ],
      },
      {
        name: 'Starter 1',
        price: 1,
        period: 'month',
        maxProjects: 3,
        maxUsers: 10,
        isPopular: false,
        features: [
          'Up to 3 Active Construction Projects',
          'Up to 10 Team Members & Engineers',
          'Daily Site Logs & Worker Attendance',
          'Subcontractor Bidding & RFQ Hub',
          'Purchase Order (PO) & Invoice System',
          'Site Daily Logs & Photo Attachments',
          'RFI & Blueprint Document Vault (5 GB)',
          'Basic Cost Control & Expense Tracking',
        ],
      },
      {
        name: 'Standard 799',
        price: 799,
        period: 'month',
        maxProjects: 10,
        maxUsers: 25,
        isPopular: true,
        features: [
          'Up to 10 Active Construction Projects',
          'Up to 25 Team Members & Subcontractors',
          'Advanced Subcontractor & Field Tracking',
          'Real-time Site & Workforce Analytics',
          'GPS Crew Clock-in & Site Geofencing',
          'Full PO Approval & Invoice Workflows',
          'Gantt Schedules & Milestone Tracking',
          'Blueprint Center with RFI System (25 GB)',
          'Automated Budget Overrun Alerts',
        ],
      },
      {
        name: 'Pro 1299',
        price: 1299,
        period: 'month',
        maxProjects: 9999,
        maxUsers: 9999,
        isPopular: false,
        features: [
          'Unlimited Active Construction Projects',
          'Unlimited Team Members & Subcontractors',
          'Complete Enterprise Construction Suite',
          'AI-Powered Scheduling & Delay Forecasts',
          'Live GPS Site Monitoring & Asset Tracking',
          'Advanced Financial Controls & Audit Logs',
          'Multi-Site Executive Dashboards & Analytics',
          'Unlimited CAD Blueprints & RFI Vault',
          '24/7 Dedicated Support & Account Manager',
        ],
      },
    ];

    for (const p of defaultPlans) {
      await planRepository.create(p);
    }
    plans = await planRepository.findAll();
    list = Array.isArray(plans) ? plans : (plans?.data || []);
  }

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
