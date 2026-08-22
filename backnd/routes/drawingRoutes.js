const express = require('express');
const router = express.Router();
const { getDrawings, createDrawing, updateDrawing, addDrawingVersion, deleteDrawing } = require('../controllers/drawingController');
const { protect, authorize, restrictAdminCreation } = require('../middlewares/authMiddleware');
const { upload, imageKitUpload } = require('../middlewares/imageKitUploadMiddleware');

router.use(protect);

router.get('/', getDrawings);
router.post('/', restrictAdminCreation('drawings', ['PM', 'ENGINEER', 'SUPER_ADMIN']), upload.single('file'), imageKitUpload, createDrawing);
router.patch('/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'ADMIN', 'PM', 'ENGINEER'), updateDrawing);
router.put('/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'ADMIN', 'PM', 'ENGINEER'), updateDrawing);
router.post('/:id/versions', restrictAdminCreation('drawing versions', ['PM', 'ENGINEER', 'SUPER_ADMIN']), upload.single('file'), imageKitUpload, addDrawingVersion);
router.delete('/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'PM'), deleteDrawing);

// Annotation Routes
const {
    getDrawingAnnotations,
    createDrawingAnnotation,
    updateDrawingAnnotation,
    deleteDrawingAnnotation
} = require('../controllers/drawingController');

router.get('/:id/annotations', getDrawingAnnotations);
router.post('/:id/annotations', createDrawingAnnotation);
router.patch('/annotations/:id', updateDrawingAnnotation);
router.delete('/annotations/:id', deleteDrawingAnnotation);

module.exports = router;
