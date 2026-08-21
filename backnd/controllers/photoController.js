const path = require('path');
const prisma = require('../config/prisma');

// @desc    Get all photos
// @route   GET /api/photos
// @access  Private
const getPhotos = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || (typeof req.user.companyId === 'object' ? (req.user.companyId._id || req.user.companyId.id) : ''));
        const whereClause = {};

        if (req.user.role !== 'SUPER_ADMIN' && userCompanyId) {
            whereClause.companyId = userCompanyId;
        }

        if (req.query.projectId && req.query.projectId !== 'All' && req.query.projectId !== 'undefined' && req.query.projectId !== '') {
            whereClause.projectId = req.query.projectId;
        }
        if (req.query.taskId && req.query.taskId !== 'undefined' && req.query.taskId !== '') {
            whereClause.taskId = req.query.taskId;
        }

        const photos = await prisma.photo.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                uploader: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(photos.map(p => ({
            ...p,
            _id: p.id,
            projectId: p.project ? { ...p.project, _id: p.projectId } : (p.projectId ? { _id: p.projectId, name: 'Project' } : null),
            uploadedBy: p.uploader || { fullName: 'Team Member', role: 'Staff' }
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Upload photo
// @route   POST /api/photos/upload
// @access  Private
const uploadPhoto = async (req, res, next) => {
    try {
        const { projectId, taskId, description } = req.body;
        const userCompanyId = String(req.user.companyId || req.companyId || (typeof req.user.companyId === 'object' ? (req.user.companyId._id || req.user.companyId.id) : ''));
        const photos = [];

        const cleanProjectId = (projectId && projectId !== 'undefined' && projectId !== 'null' && projectId !== '') ? projectId : null;
        const cleanTaskId = (taskId && taskId !== 'undefined' && taskId !== 'null' && taskId !== '') ? taskId : null;

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                let imageUrl = file.path;
                if (file.filename) {
                    imageUrl = `/uploads/photos/${file.filename}`;
                } else if (file.path && !file.path.startsWith('http')) {
                    const fname = path.basename(file.path);
                    imageUrl = `/uploads/photos/${fname}`;
                }

                const photo = await prisma.photo.create({
                    data: {
                        companyId: userCompanyId,
                        projectId: cleanProjectId,
                        taskId: cleanTaskId,
                        uploadedBy: req.user.id,
                        imageUrl,
                        description: description || file.originalname
                    }
                });
                photos.push(photo);
            }
        } else if (req.body.imageUrl) {
            const photo = await prisma.photo.create({
                data: {
                    companyId: userCompanyId,
                    projectId: cleanProjectId,
                    taskId: cleanTaskId,
                    uploadedBy: req.user.id,
                    imageUrl: req.body.imageUrl,
                    description: description || ''
                }
            });
            photos.push(photo);
        }

        if (photos.length === 0) {
            res.status(400);
            throw new Error('Please upload at least one image file or provide an imageUrl');
        }

        const photoIds = photos.map(p => p.id);
        const populated = await prisma.photo.findMany({
            where: { id: { in: photoIds } },
            include: {
                project: { select: { name: true } },
                uploader: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(201).json(populated.map(p => ({
            ...p,
            _id: p.id,
            projectId: p.project ? { ...p.project, _id: p.projectId } : (p.projectId ? { _id: p.projectId, name: 'Project' } : null),
            uploadedBy: p.uploader || { fullName: 'Team Member', role: 'Staff' }
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:id
// @access  Private
const deletePhoto = async (req, res, next) => {
    try {
        const photo = await prisma.photo.findUnique({
            where: { id: req.params.id }
        });

        const userCompanyId = String(req.user.companyId || req.companyId || '');
        if (!photo || (req.user.role !== 'SUPER_ADMIN' && String(photo.companyId) !== userCompanyId)) {
            res.status(404);
            throw new Error('Photo not found');
        }

        await prisma.photo.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Photo removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPhotos,
    uploadPhoto,
    deletePhoto
};
