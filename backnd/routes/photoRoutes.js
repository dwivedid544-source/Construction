const express = require('express');
const router = express.Router();
const { getPhotos, uploadPhoto, deletePhoto } = require('../controllers/photoController');
const { protect, restrictAdminCreation } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(protect);

router.get('/', getPhotos);
router.post('/upload', restrictAdminCreation('site photos', ['PM', 'FOREMAN', 'WORKER', 'ENGINEER', 'SUPER_ADMIN']), upload.array('images', 10), uploadPhoto);
router.delete('/:id', deletePhoto);

module.exports = router;
