const prisma = require('../config/prisma');

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private
const getIssues = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.projectId) where.projectId = req.query.projectId;
        if (req.query.status) where.status = req.query.status;

        const issues = await prisma.issue.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                reportedBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(issues.map(i => ({
            ...i,
            _id: i.id,
            projectId: i.project ? { _id: i.project.id, name: i.project.name } : null,
            reportedBy: i.reportedBy ? { _id: i.reportedBy.id, fullName: i.reportedBy.name } : null,
            assignedTo: i.assignedTo ? { _id: i.assignedTo.id, fullName: i.assignedTo.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
const createIssue = async (req, res, next) => {
    try {
        const { projectId, title, description, severity, status, assignedToId } = req.body;

        const issue = await prisma.issue.create({
            data: {
                projectId,
                reportedById: req.user._id || req.user.id,
                assignedToId: assignedToId || null,
                title: title || 'Untitled Issue',
                description: description || null,
                severity: severity || 'MEDIUM',
                status: status || 'OPEN'
            },
            include: {
                project: { select: { id: true, name: true } },
                reportedBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...issue,
            _id: issue.id,
            projectId: issue.project ? { _id: issue.project.id, name: issue.project.name } : null,
            reportedBy: issue.reportedBy ? { _id: issue.reportedBy.id, fullName: issue.reportedBy.name } : null,
            assignedTo: issue.assignedTo ? { _id: issue.assignedTo.id, fullName: issue.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update issue
// @route   PATCH /api/issues/:id
// @access  Private
const updateIssue = async (req, res, next) => {
    try {
        const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

        if (!issue) {
            res.status(404);
            throw new Error('Issue not found');
        }

        const { title, description, severity, status, assignedToId } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (severity !== undefined) updateData.severity = severity;
        if (status !== undefined) updateData.status = status;
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

        const updatedIssue = await prisma.issue.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                reportedBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedIssue,
            _id: updatedIssue.id,
            projectId: updatedIssue.project ? { _id: updatedIssue.project.id, name: updatedIssue.project.name } : null,
            reportedBy: updatedIssue.reportedBy ? { _id: updatedIssue.reportedBy.id, fullName: updatedIssue.reportedBy.name } : null,
            assignedTo: updatedIssue.assignedTo ? { _id: updatedIssue.assignedTo.id, fullName: updatedIssue.assignedTo.name } : null
        });
    } catch (error) {
        next(error);
    }
};

const deleteIssue = async (req, res, next) => {
    try {
        const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });
        if (!issue) {
            res.status(404);
            throw new Error('Issue not found');
        }
        await prisma.issue.delete({ where: { id: req.params.id } });
        res.json({ message: 'Issue removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getIssues,
    createIssue,
    updateIssue,
    deleteIssue
};
