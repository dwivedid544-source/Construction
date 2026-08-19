const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
    getStats,
    approveCompany,
    rejectCompany,
    getTransactions,
    getSupportTickets,
    getAuditLogs,
    getCompanies
} = require('../controllers/superAdminController');

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.get('/dashboard/stats', getStats);
router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/reject', rejectCompany);

// Billing & Revenue
router.get('/billing/transactions', getTransactions);
// getBillingStats not yet in controller — placeholder
router.get('/billing/stats', (req, res) => res.json({ message: 'Not implemented' }));

// Companies
router.get('/companies', getCompanies);

// Support
router.get('/support/tickets', getSupportTickets);
// updateSupportTicket not yet in controller — placeholder
router.patch('/support/tickets/:id', (req, res) => res.status(501).json({ message: 'Not implemented' }));

// User Management — getGlobalUsers not yet in controller — placeholder
router.get('/users', (req, res) => res.json([]));

// System Logs — getSystemLogs not yet in controller — uses getAuditLogs
router.get('/logs', getAuditLogs);

module.exports = router;
