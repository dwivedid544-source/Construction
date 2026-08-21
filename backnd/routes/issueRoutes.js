const express = require('express');
const router = express.Router();
const { getIssues, createIssue, updateIssue, deleteIssue } = require('../controllers/issueController');
const { protect, restrictAdminCreation } = require('../middlewares/authMiddleware');
const { upload, imageKitUpload } = require('../middlewares/imageKitUploadMiddleware');

router.use(protect);

router.get('/', getIssues);
router.post('/', restrictAdminCreation('issues', ['PM', 'FOREMAN', 'WORKER', 'ENGINEER', 'SUBCONTRACTOR', 'SUPER_ADMIN']), upload.array('images', 5), imageKitUpload, createIssue);
router.patch('/:id', upload.array('images', 5), imageKitUpload, updateIssue);
router.delete('/:id', deleteIssue);

module.exports = router;
