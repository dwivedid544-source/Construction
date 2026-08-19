const prisma = require('../config/prisma');

// @desc    Create a correction request
// @route   POST /api/corrections
// @access  Private
const createCorrectionRequest = async (req, res, next) => {
    try {
        const { timeLogId, requestedChanges } = req.body;

        const timeLog = await prisma.timeLog.findUnique({
            where: { id: timeLogId }
        });
        if (!timeLog) {
            res.status(404);
            throw new Error('TimeLog not found');
        }

        const correction = await prisma.correctionRequest.create({
            data: {
                companyId: req.user.companyId,
                userId: req.user.id,
                timeLogId,
                requestedChanges: typeof requestedChanges === 'string' ? JSON.parse(requestedChanges) : requestedChanges
            }
        });

        // Notify Admins/PMs
        const pms = await prisma.user.findMany({
            where: {
                companyId: req.user.companyId,
                role: { in: ['PM', 'COMPANY_OWNER'] }
            }
        });

        await Promise.all(pms.map(pm => {
            return prisma.notification.create({
                data: {
                    companyId: req.user.companyId,
                    userId: pm.id,
                    title: 'New Correction Request',
                    message: `${req.user.fullName} has requested a correction for their timesheet on ${new Date(timeLog.clockIn).toLocaleDateString()}.`,
                    type: 'financial'
                }
            });
        }));

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
        const query = { companyId: req.user.companyId };

        if (!['PM', 'COMPANY_OWNER'].includes(req.user.role)) {
            query.userId = req.user.id;
        }

        const corrections = await prisma.correctionRequest.findMany({
            where: query,
            include: {
                user: { select: { fullName: true, role: true } },
                timeLog: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(corrections.map(c => ({
            ...c,
            _id: c.id,
            userId: c.user,
            timeLogId: c.timeLog
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
        const { status, reviewNotes } = req.body;
        const correction = await prisma.correctionRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!correction) {
            res.status(404);
            throw new Error('Correction request not found');
        }

        const updated = await prisma.correctionRequest.update({
            where: { id: req.params.id },
            data: {
                status,
                reviewNotes: reviewNotes || '',
                reviewedBy: req.user.id
            }
        });

        // If approved, update the original TimeLog
        if (status === 'approved' && correction.requestedChanges) {
            const changes = typeof correction.requestedChanges === 'string' ? JSON.parse(correction.requestedChanges) : correction.requestedChanges;
            const timeLogUpdate = {};
            if (changes.clockIn) timeLogUpdate.clockIn = new Date(changes.clockIn);
            if (changes.clockOut) timeLogUpdate.clockOut = new Date(changes.clockOut);

            if (Object.keys(timeLogUpdate).length > 0) {
                await prisma.timeLog.update({
                    where: { id: correction.timeLogId },
                    data: timeLogUpdate
                });
            }
        }

        // Notify User
        await prisma.notification.create({
            data: {
                companyId: req.user.companyId,
                userId: correction.userId,
                title: `Correction Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                message: `Your correction request for ${new Date(correction.createdAt).toLocaleDateString()} has been ${status}.`,
                type: 'system'
            }
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
        const correction = await prisma.correctionRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!correction) {
            res.status(404);
            throw new Error('Correction request not found');
        }

        if (!['PM', 'COMPANY_OWNER'].includes(req.user.role) && correction.userId !== req.user.id) {
            res.status(403);
            throw new Error('Not authorized to delete this request');
        }

        await prisma.correctionRequest.delete({
            where: { id: req.params.id }
        });

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
        if (!['PM', 'COMPANY_OWNER'].includes(req.user.role)) {
            res.status(403);
            throw new Error('Not authorized to perform bulk deletion');
        }

        const { ids } = req.body;
        if (ids && ids.length > 0) {
            await prisma.correctionRequest.deleteMany({
                where: { id: { in: ids }, companyId: req.user.companyId }
            });
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
