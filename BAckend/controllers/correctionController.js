const prisma = require('../config/prisma');

// @desc    Create a correction request
// @route   POST /api/corrections
// @access  Private
const createCorrectionRequest = async (req, res, next) => {
    try {
        const { projectId, itemType, description } = req.body;

        const correction = await prisma.correctionRequest.create({
            data: {
                projectId,
                requestedById: req.user._id || req.user.id,
                itemType: itemType || 'TimeLog',
                description: description || 'Timesheet correction request',
                status: 'PENDING'
            }
        });

        res.status(201).json({ ...correction, _id: correction.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all correction requests for a company
// @route   GET /api/corrections
// @access  Private
const getCorrectionRequests = async (req, res, next) => {
    try {
        const where = {};
        if (!['PM', 'COMPANY_OWNER'].includes(req.user.role)) {
            where.requestedById = req.user._id || req.user.id;
        }

        const corrections = await prisma.correctionRequest.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, name: true, roleId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(corrections.map(c => ({
            ...c,
            _id: c.id,
            userId: c.requestedBy ? { _id: c.requestedBy.id, fullName: c.requestedBy.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Update correction request status (Approve/Reject)
// @route   PATCH /api/corrections/:id
// @access  Private (PM, Owners)
const updateCorrectionRequest = async (req, res, next) => {
    try {
        const { status } = req.body;
        const correction = await prisma.correctionRequest.findUnique({ where: { id: req.params.id } });

        if (!correction) {
            res.status(404);
            throw new Error('Correction request not found');
        }

        const updated = await prisma.correctionRequest.update({
            where: { id: req.params.id },
            data: { status: status ? status.toUpperCase() : correction.status }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a correction request
// @route   DELETE /api/corrections/:id
// @access  Private (PM, Owners, or the user who created it)
const deleteCorrectionRequest = async (req, res, next) => {
    try {
        const correction = await prisma.correctionRequest.findUnique({ where: { id: req.params.id } });

        if (!correction) {
            res.status(404);
            throw new Error('Correction request not found');
        }

        await prisma.correctionRequest.delete({ where: { id: req.params.id } });
        res.json({ message: 'Correction request removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete multiple correction requests (e.g. all pending)
// @route   POST /api/corrections/bulk-delete
// @access  Private (PM, Owners)
const deleteMultipleCorrections = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (ids && Array.isArray(ids)) {
            await prisma.correctionRequest.deleteMany({ where: { id: { in: ids } } });
        }

        res.json({ message: 'Corrections removed successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCorrectionRequest,
    getCorrectionRequests,
    updateCorrectionRequest,
    deleteCorrectionRequest,
    deleteMultipleCorrections
};
