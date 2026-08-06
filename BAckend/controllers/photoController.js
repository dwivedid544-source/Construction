const prisma = require('../config/prisma');

// @desc    Get all photos
// @route   GET /api/photos
// @access  Private
const getPhotos = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        if (req.query.projectId) {
            where.projectId = req.query.projectId;
        }

        const photos = await prisma.photo.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                uploadedBy: { select: { id: true, name: true, roleId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(photos.map(p => ({
            ...p,
            _id: p.id,
            imageUrl: p.url,
            description: p.caption,
            projectId: p.project ? { _id: p.project.id, name: p.project.name } : null,
            uploadedBy: p.uploadedBy ? { _id: p.uploadedBy.id, fullName: p.uploadedBy.name } : null
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
        const { projectId, description, caption } = req.body;
        const createdPhotos = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imageUrl = file.path;
                const photo = await prisma.photo.create({
                    data: {
                        companyId: req.user.companyId,
                        projectId: projectId || req.body.projectId,
                        uploadedById: req.user._id || req.user.id,
                        url: imageUrl,
                        caption: description || caption || file.originalname
                    }
                });
                createdPhotos.push(photo);
            }
        } else if (req.body.imageUrl || req.body.url) {
            const photo = await prisma.photo.create({
                data: {
                    companyId: req.user.companyId,
                    projectId: projectId || req.body.projectId,
                    uploadedById: req.user._id || req.user.id,
                    url: req.body.imageUrl || req.body.url,
                    caption: description || caption || null
                }
            });
            createdPhotos.push(photo);
        }

        if (createdPhotos.length === 0) {
            res.status(400);
            throw new Error('Please upload at least one image file or provide an imageUrl');
        }

        const photoIds = createdPhotos.map(p => p.id);
        const populated = await prisma.photo.findMany({
            where: { id: { in: photoIds } },
            include: {
                project: { select: { id: true, name: true } },
                uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(201).json(populated.map(p => ({
            ...p,
            _id: p.id,
            imageUrl: p.url,
            description: p.caption,
            projectId: p.project ? { _id: p.project.id, name: p.project.name } : null,
            uploadedBy: p.uploadedBy ? { _id: p.uploadedBy.id, fullName: p.uploadedBy.name } : null
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
        const photo = await prisma.photo.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!photo) {
            res.status(404);
            throw new Error('Photo not found');
        }

        await prisma.photo.delete({ where: { id: req.params.id } });
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
