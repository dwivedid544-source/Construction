const express = require('express');
const router = express.Router();
const { protect, authorize, restrictPMAdmin } = require('../middlewares/authMiddleware');
const {
    createOrder,
    verifyPayment,
    getBillingHistory,
    handleWebhook
} = require('../controllers/billingController');

// Public Webhook route
router.post('/webhook', handleWebhook);

// Protected subscription routes - strictly for Company Owners
router.post('/create-order', protect, restrictPMAdmin('Subscription management'), createOrder);
router.post('/verify-payment', protect, restrictPMAdmin('Subscription management'), verifyPayment);
router.get('/history', protect, restrictPMAdmin('Billing history'), getBillingHistory);

module.exports = router;
