const prisma = require('../config/prisma');

// @desc    Get all RFIs for a company
// @route   GET /api/rfis
// @access  Private
const getRFIs = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        if (req.query.projectId) {
            where.projectId = req.query.projectId;
        }

        if (req.query.status) where.status = req.query.status;

        const rfis = await prisma.rFI.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, roleId: true } },
                assignedTo: { select: { id: true, name: true, roleId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(rfis.map(r => ({
            ...r,
            _id: r.id,
            projectId: r.project ? { _id: r.project.id, name: r.project.name } : null,
            raisedBy: r.createdBy ? { _id: r.createdBy.id, fullName: r.createdBy.name } : null,
            assignedTo: r.assignedTo ? { _id: r.assignedTo.id, fullName: r.assignedTo.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Get RFI dashboard stats
// @route   GET /api/rfis/stats
// @access  Private
const getRFIStats = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const where = { companyId };

        const [total, open, inReview, answered, closed, recent] = await Promise.all([
            prisma.rFI.count({ where }),
            prisma.rFI.count({ where: { ...where, status: 'OPEN' } }),
            prisma.rFI.count({ where: { ...where, status: 'IN_REVIEW' } }),
            prisma.rFI.count({ where: { ...where, status: 'ANSWERED' } }),
            prisma.rFI.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.rFI.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        res.json({
            stats: { total, open, inReview, answered, closed, overdue: 0 },
            recentRFIs: recent.map(r => ({ ...r, _id: r.id, raisedBy: r.createdBy ? { fullName: r.createdBy.name } : null })),
            highPriorityRFIs: [],
            overdueRFIs: []
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single RFI
// @route   GET /api/rfis/:id
// @access  Private
const getRFIById = async (req, res, next) => {
    try {
        const rfi = await prisma.rFI.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId },
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found or access denied');
        }

        res.json({
            ...rfi,
            _id: rfi.id,
            projectId: rfi.project ? { _id: rfi.project.id, name: rfi.project.name } : null,
            raisedBy: rfi.createdBy ? { _id: rfi.createdBy.id, fullName: rfi.createdBy.name } : null,
            assignedTo: rfi.assignedTo ? { _id: rfi.assignedTo.id, fullName: rfi.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create RFI
// @route   POST /api/rfis
// @access  Private
const createRFI = async (req, res, next) => {
    try {
        const { projectId, title, question, assignedToId } = req.body;

        const maxRfi = await prisma.rFI.findFirst({
            where: { projectId },
            orderBy: { number: 'desc' }
        });
        const number = (maxRfi?.number || 0) + 1;

        const rfi = await prisma.rFI.create({
            data: {
                number,
                projectId,
                companyId: req.user.companyId,
                createdById: req.user._id || req.user.id,
                assignedToId: assignedToId || null,
                title: title || 'Untitled RFI',
                question: question || '',
                status: 'OPEN'
            },
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...rfi,
            _id: rfi.id,
            projectId: rfi.project ? { _id: rfi.project.id, name: rfi.project.name } : null,
            raisedBy: rfi.createdBy ? { _id: rfi.createdBy.id, fullName: rfi.createdBy.name } : null,
            assignedTo: rfi.assignedTo ? { _id: rfi.assignedTo.id, fullName: rfi.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update RFI (status, reassign, response)
// @route   PATCH /api/rfis/:id
// @access  Private
const updateRFI = async (req, res, next) => {
    try {
        const rfi = await prisma.rFI.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found');
        }

        const { title, question, answer, status, assignedToId } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (question !== undefined) updateData.question = question;
        if (answer !== undefined) updateData.answer = answer;
        if (status !== undefined) updateData.status = status;
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

        const updated = await prisma.rFI.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            projectId: updated.project ? { _id: updated.project.id, name: updated.project.name } : null,
            raisedBy: updated.createdBy ? { _id: updated.createdBy.id, fullName: updated.createdBy.name } : null,
            assignedTo: updated.assignedTo ? { _id: updated.assignedTo.id, fullName: updated.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add comment to RFI
// @route   POST /api/rfis/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
    try {
        const { text, answer } = req.body;
        const commentText = text || answer;
        if (!commentText) {
            res.status(400);
            throw new Error('Comment text is required');
        }

        const rfi = await prisma.rFI.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found');
        }

        const updated = await prisma.rFI.update({
            where: { id: req.params.id },
            data: { answer: rfi.answer ? `${rfi.answer}\n${commentText}` : commentText },
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            projectId: updated.project ? { _id: updated.project.id, name: updated.project.name } : null,
            raisedBy: updated.createdBy ? { _id: updated.createdBy.id, fullName: updated.createdBy.name } : null,
            assignedTo: updated.assignedTo ? { _id: updated.assignedTo.id, fullName: updated.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete RFI
// @route   DELETE /api/rfis/:id
// @access  Private (Owner/PM only)
const deleteRFI = async (req, res, next) => {
    try {
        const rfi = await prisma.rFI.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found');
        }
        await prisma.rFI.delete({ where: { id: req.params.id } });
        res.json({ message: 'RFI deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getRFIs, getRFIStats, getRFIById, createRFI, updateRFI, addComment, deleteRFI };
