const prisma = require('../config/prisma');

// @desc    Get all photos
// @route   GET /api/photos
// @access  Private
const getPhotos = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };

        if (['PM', 'FOREMAN', 'WORKER', 'CLIENT'].includes(req.user.role)) {
            if (req.user.role === 'CLIENT') {
                const clientProjects = await prisma.project.findMany({
                    where: { companyId: req.user.companyId, clientId: req.user.id },
                    select: { id: true }
                });
                const clientProjectIds = clientProjects.map(p => p.id);
                
                if (req.query.projectId) {
                    if (!clientProjectIds.includes(req.query.projectId)) {
                        return res.status(403).json({ message: 'Not authorized for this project' });
                    }
                    whereClause.projectId = req.query.projectId;
                } else {
                    whereClause.projectId = { in: clientProjectIds };
                }
            } else {
                const jobFilter = { companyId: req.user.companyId };

                if (req.user.role === 'PM') {
                    jobFilter.OR = [
                        { foremanId: req.user.id },
                        { createdBy: req.user.id }
                    ];
                } else if (req.user.role === 'FOREMAN') {
                    jobFilter.foremanId = req.user.id;
                } else {
                    jobFilter.assignedWorkers = { some: { id: req.user.id } };
                }

                const assignedJobs = await prisma.job.findMany({
                    where: jobFilter,
                    select: { projectId: true }
                });
                const jobProjectIds = assignedJobs.map(j => j.projectId).filter(Boolean);

                let allowedProjectIds = [];
                if (req.user.role === 'PM') {
                    const directProjects = await prisma.project.findMany({
                        where: {
                            companyId: req.user.companyId,
                            OR: [
                                { pms: { some: { id: req.user.id } } },
                                { pmId: req.user.id },
                                { createdBy: req.user.id }
                            ]
                        },
                        select: { id: true }
                    });
                    const directProjectIds = directProjects.map(p => p.id);
                    allowedProjectIds = Array.from(new Set([...jobProjectIds, ...directProjectIds]));
                } else {
                    allowedProjectIds = jobProjectIds;
                }

                if (req.query.projectId) {
                    whereClause.projectId = req.query.projectId;
                } else {
                    whereClause.OR = [
                        { uploadedBy: req.user.id },
                        { projectId: { in: allowedProjectIds } }
                    ];
                }
            }
        } else {
            if (req.query.projectId) {
                whereClause.projectId = req.query.projectId;
            }
        }

        if (req.query.taskId) whereClause.taskId = req.query.taskId;

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
            projectId: p.project,
            uploadedBy: p.uploader
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
        const photos = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imageUrl = file.path;
                const photo = await prisma.photo.create({
                    data: {
                        companyId: req.user.companyId,
                        projectId: projectId || null,
                        taskId: taskId || null,
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
                    companyId: req.user.companyId,
                    projectId: projectId || null,
                    taskId: taskId || null,
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
            projectId: p.project,
            uploadedBy: p.uploader
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
