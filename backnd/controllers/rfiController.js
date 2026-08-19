const prisma = require('../config/prisma');

// @desc    Get all RFIs for a company
// @route   GET /api/rfis
// @access  Private
const getRFIs = async (req, res, next) => {
    try {
        const query = { companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            const projects = await prisma.project.findMany({
                where: { clientId: req.user.id },
                select: { id: true }
            });
            const projectIds = projects.map(p => p.id);
            query.projectId = { in: projectIds };

            const subs = await prisma.user.findMany({
                where: { role: 'SUBCONTRACTOR' },
                select: { id: true }
            });
            query.createdBy = { notIn: subs.map(s => s.id) };
        } else if (req.user.role === 'SUBCONTRACTOR') {
            query.OR = [
                { createdBy: req.user.id },
                { assignedTo: req.user.id }
            ];
        } else if (req.user.role === 'FOREMAN') {
            query.createdBy = req.user.id;
        }

        if (req.query.projectId) {
            if (req.user.role === 'CLIENT') {
                const allowedProjects = query.projectId?.in || [];
                if (!allowedProjects.includes(req.query.projectId)) {
                    res.status(403);
                    throw new Error('Not authorized to access RFIs for this project');
                }
            }
            query.projectId = req.query.projectId;
        }

        if (req.query.status) query.status = req.query.status;
        if (req.query.priority) query.priority = req.query.priority;

        const rfis = await prisma.rfi.findMany({
            where: query,
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, email: true, role: true } },
                assignee: { select: { fullName: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const result = rfis.map(r => ({
            ...r,
            _id: r.id,
            projectId: r.project,
            raisedBy: r.creator,
            assignedTo: r.assignee,
            isOverdue: r.dueDate && r.status !== 'closed' && new Date(r.dueDate) < now
        }));

        res.json(result);
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
        const now = new Date();
        const query = { companyId };

        if (req.user.role === 'CLIENT') {
            const projects = await prisma.project.findMany({
                where: { clientId: req.user.id },
                select: { id: true }
            });
            const projectIds = projects.map(p => p.id);
            query.projectId = { in: projectIds };

            const subs = await prisma.user.findMany({
                where: { role: 'SUBCONTRACTOR' },
                select: { id: true }
            });
            query.createdBy = { notIn: subs.map(s => s.id) };
        } else if (req.user.role === 'SUBCONTRACTOR') {
            query.OR = [
                { createdBy: req.user.id },
                { assignedTo: req.user.id }
            ];
        } else if (req.user.role === 'FOREMAN') {
            query.createdBy = req.user.id;
        }

        const [total, open, inReview, answered, closed, overdue] = await Promise.all([
            prisma.rfi.count({ where: query }),
            prisma.rfi.count({ where: { ...query, status: 'open' } }),
            prisma.rfi.count({ where: { ...query, status: 'in_review' } }),
            prisma.rfi.count({ where: { ...query, status: 'answered' } }),
            prisma.rfi.count({ where: { ...query, status: 'closed' } }),
            prisma.rfi.count({ where: { ...query, NOT: { status: 'closed' }, dueDate: { lt: now } } })
        ]);

        const highPriority = await prisma.rfi.findMany({
            where: { ...query, priority: 'high', NOT: { status: 'closed' } },
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const recent = await prisma.rfi.findMany({
            where: query,
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } },
                assignee: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        res.json({
            stats: { total, open, inReview: inReview, answered, closed, overdue },
            recentRFIs: recent.map(r => ({ ...r, _id: r.id, projectId: r.project, raisedBy: r.creator, assignedTo: r.assignee })),
            highPriorityRFIs: highPriority.map(r => ({ ...r, _id: r.id, projectId: r.project, raisedBy: r.creator })),
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
        const query = { id: req.params.id, companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            const projects = await prisma.project.findMany({
                where: { clientId: req.user.id },
                select: { id: true }
            });
            const projectIds = projects.map(p => p.id);
            query.projectId = { in: projectIds };

            const subs = await prisma.user.findMany({
                where: { role: 'SUBCONTRACTOR' },
                select: { id: true }
            });
            query.createdBy = { notIn: subs.map(s => s.id) };
        } else if (req.user.role === 'SUBCONTRACTOR') {
            query.OR = [
                { createdBy: req.user.id },
                { assignedTo: req.user.id }
            ];
        } else if (req.user.role === 'FOREMAN') {
            query.createdBy = req.user.id;
        }

        const rfi = await prisma.rfi.findFirst({
            where: query,
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, email: true, role: true } },
                assignee: { select: { fullName: true, email: true, role: true } }
            }
        });

        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found or access denied');
        }

        res.json({
            ...rfi,
            _id: rfi.id,
            projectId: rfi.project,
            raisedBy: rfi.creator,
            assignedTo: rfi.assignee,
            isOverdue: rfi.dueDate && rfi.status !== 'closed' && new Date(rfi.dueDate) < new Date()
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
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                name: file.originalname,
                url: file.path.replace(/\\/g, '/')
            }));
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.dueDate) data.dueDate = new Date(data.dueDate);

        const rfi = await prisma.rfi.create({
            data: {
                ...data,
                number: data.number || `RFI-${Date.now()}`,
                companyId: req.user.companyId,
                createdBy: req.user.id,
                attachments
            },
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } },
                assignee: { select: { fullName: true, role: true } }
            }
        });

        res.status(201).json({
            ...rfi,
            _id: rfi.id,
            projectId: rfi.project,
            raisedBy: rfi.creator,
            assignedTo: rfi.assignee
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
        const rfi = await prisma.rfi.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.dueDate) data.dueDate = new Date(data.dueDate);

        const updated = await prisma.rfi.update({
            where: { id: req.params.id },
            data,
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } },
                assignee: { select: { fullName: true, role: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            projectId: updated.project,
            raisedBy: updated.creator,
            assignedTo: updated.assignee
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
        const { text } = req.body;
        if (!text) {
            res.status(400);
            throw new Error('Comment text is required');
        }

        const rfi = await prisma.rfi.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!rfi) {
            res.status(404);
            throw new Error('RFI not found');
        }

        let comments = [];
        if (typeof rfi.comments === 'string') {
            try { comments = JSON.parse(rfi.comments); } catch (e) {}
        } else if (Array.isArray(rfi.comments)) {
            comments = rfi.comments;
        }

        comments.push({
            authorId: req.user.id,
            authorName: req.user.fullName,
            text,
            createdAt: new Date()
        });

        const updated = await prisma.rfi.update({
            where: { id: rfi.id },
            data: { comments },
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true, role: true } },
                assignee: { select: { fullName: true, role: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            projectId: updated.project,
            raisedBy: updated.creator,
            assignedTo: updated.assignee
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
        const deleted = await prisma.rfi.deleteMany({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (deleted.count === 0) {
            res.status(404);
            throw new Error('RFI not found');
        }
        res.json({ message: 'RFI deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getRFIs, getRFIStats, getRFIById, createRFI, updateRFI, addComment, deleteRFI };
