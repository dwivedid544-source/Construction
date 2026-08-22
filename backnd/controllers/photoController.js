const path = require('path');
const Photo = require('../models/Photo');
const Job = require('../models/Job');
const Project = require('../models/Project');
const prisma = require('../config/prisma');

// @desc    Get all photos
// @route   GET /api/photos
// @access  Private
const getPhotos = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || (typeof req.user.companyId === 'object' ? (req.user.companyId._id || req.user.companyId.id) : ''));
        const filter = {};

        if (req.user.role !== 'SUPER_ADMIN' && userCompanyId) {
            filter.companyId = userCompanyId;
        }

        if (req.query.projectId && req.query.projectId !== 'All' && req.query.projectId !== 'undefined' && req.query.projectId !== '') {
            filter.projectId = req.query.projectId;
        }
        if (req.query.jobId && req.query.jobId !== 'undefined' && req.query.jobId !== '') {
            filter.jobId = req.query.jobId;
        }
        if (req.query.taskId && req.query.taskId !== 'undefined' && req.query.taskId !== '') {
            filter.taskId = req.query.taskId;
        }

        const photos = await Photo.find(filter)
            .populate('projectId', 'name')
            .populate('jobId', 'name')
            .populate('uploadedBy', 'fullName role')
            .sort({ createdAt: -1 })
            .lean();

        res.json(photos.map(p => ({
            ...p,
            _id: p._id.toString(),
            id: p._id.toString(),
            imageUrl: p.imageUrl || p.url,
            url: p.imageUrl || p.url,
            projectId: p.projectId ? { ...p.projectId, _id: (p.projectId._id || p.projectId).toString() } : null,
            jobId: p.jobId ? { ...p.jobId, _id: (p.jobId._id || p.jobId).toString() } : null,
            uploadedBy: p.uploadedBy || { fullName: 'Team Member', role: 'Staff' }
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Upload photo(s)
// @route   POST /api/photos/upload
// @access  Private
const uploadPhoto = async (req, res, next) => {
    try {
        const { projectId, jobId, taskId, description } = req.body;
        const userCompanyId = String(req.user.companyId || req.companyId || (typeof req.user.companyId === 'object' ? (req.user.companyId._id || req.user.companyId.id) : ''));
        const photos = [];

        const cleanProjectId = (projectId && projectId !== 'undefined' && projectId !== 'null' && projectId !== '') ? projectId : null;
        const cleanJobId = (jobId && jobId !== 'undefined' && jobId !== 'null' && jobId !== '') ? jobId : null;
        const cleanTaskId = (taskId && taskId !== 'undefined' && taskId !== 'null' && taskId !== '') ? taskId : null;

        const files = req.files || (req.file ? [req.file] : []);

        if (files && files.length > 0) {
            for (const file of files) {
                let imageUrl = file.path;
                if (file.filename) {
                    imageUrl = `/uploads/photos/${file.filename}`;
                } else if (file.path && !file.path.startsWith('http')) {
                    const fname = path.basename(file.path);
                    imageUrl = `/uploads/photos/${fname}`;
                }

                const photoDoc = await Photo.create({
                    companyId: userCompanyId,
                    projectId: cleanProjectId,
                    jobId: cleanJobId,
                    taskId: cleanTaskId,
                    uploadedBy: req.user.id || req.user._id,
                    imageUrl,
                    url: imageUrl,
                    description: description || file.originalname
                });

                // Also sync with Prisma if possible
                try {
                    await prisma.photo.create({
                        data: {
                            id: photoDoc._id.toString(),
                            companyId: userCompanyId,
                            projectId: cleanProjectId,
                            taskId: cleanTaskId,
                            uploadedBy: String(req.user.id || req.user._id),
                            imageUrl,
                            description: description || file.originalname
                        }
                    });
                } catch (e) {
                    // Ignore Prisma sync error
                }

                photos.push(photoDoc);
            }
        } else if (req.body.imageUrl) {
            const photoDoc = await Photo.create({
                companyId: userCompanyId,
                projectId: cleanProjectId,
                jobId: cleanJobId,
                taskId: cleanTaskId,
                uploadedBy: req.user.id || req.user._id,
                imageUrl: req.body.imageUrl,
                url: req.body.imageUrl,
                description: description || ''
            });
            photos.push(photoDoc);
        }

        if (photos.length === 0) {
            res.status(400);
            throw new Error('Please upload at least one image file or provide an imageUrl');
        }

        const photoIds = photos.map(p => p._id);
        const populated = await Photo.find({ _id: { $in: photoIds } })
            .populate('projectId', 'name')
            .populate('jobId', 'name')
            .populate('uploadedBy', 'fullName role')
            .lean();

        res.status(201).json(populated.map(p => ({
            ...p,
            _id: p._id.toString(),
            id: p._id.toString(),
            imageUrl: p.imageUrl || p.url,
            url: p.imageUrl || p.url,
            projectId: p.projectId ? { ...p.projectId, _id: (p.projectId._id || p.projectId).toString() } : null,
            jobId: p.jobId ? { ...p.jobId, _id: (p.jobId._id || p.jobId).toString() } : null,
            uploadedBy: p.uploadedBy || { fullName: 'Team Member', role: 'Staff' }
        })));
    } catch (error) {
        console.error('uploadPhoto error:', error);
        next(error);
    }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:id
// @access  Private
const deletePhoto = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const photo = await Photo.findOne({
            _id: req.params.id,
            ...(req.user.role !== 'SUPER_ADMIN' ? { companyId: userCompanyId } : {})
        });

        if (!photo) {
            res.status(404);
            throw new Error('Photo not found');
        }

        await Photo.deleteOne({ _id: req.params.id });

        try {
            await prisma.photo.delete({
                where: { id: req.params.id }
            });
        } catch (e) {
            // Ignore Prisma error
        }

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
