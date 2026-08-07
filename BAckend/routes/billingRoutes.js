/**
 * billingRoutes.js — SaaS Subscription & Billing API Endpoints.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getUsageStats } = require('../controllers/billingController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/usage', getUsageStats);

module.exports = router;
