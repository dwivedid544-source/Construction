const express = require('express');
const router = express.Router();
const { 
    getPayrollPreview, 
    getJobsPayroll, 
    runPayroll, 
    getPayrollHistory, 
    getPayrollDetails, 
    getPayrollSlip 
} = require('../controllers/payrollController');
const { protect, authorize, restrictPMAdmin } = require('../middlewares/authMiddleware');

router.use(protect);
// Payroll is strictly restricted to Company Owners (Oversight & Finance Control)
router.use(restrictPMAdmin('Payroll management'));

router.get('/preview', getPayrollPreview);
router.get('/jobs', getJobsPayroll);
router.post('/run', runPayroll);
router.get('/history', getPayrollHistory);
router.get('/details', getPayrollDetails);
router.get('/slip/:id', getPayrollSlip);

module.exports = router;
