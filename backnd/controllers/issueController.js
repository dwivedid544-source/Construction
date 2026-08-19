const prisma = require('../config/prisma');

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private
const getIssues = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const whereClause = { companyId };

        if (['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(role)) {
            whereClause.OR = [
                { assignedTo: userId },
                { createdBy: userId }
            ];
        }

        if (req.query.projectId) whereClause.projectId = req.query.projectId;
        if (req.query.jobId) whereClause.jobId = req.query.jobId;
        if (req.query.status) {
            // Prisma enum checking
            whereClause.status = req.query.status;
        }

        const issues = await prisma.issue.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                assignee: { select: { fullName: true } },
                creator: { select: { fullName: true } },
                photos: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = issues.map(issue => ({
            ...issue,
            _id: issue.id,
            projectId: issue.project,
            assignedTo: issue.assignee,
            reportedBy: issue.creator,
            photoIds: issue.photos
        }));

        res.json(mapped);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
const createIssue = async (req, res, next) => {
    try {
        const { projectId, jobId, title, description, severity, status, category, assignedTo } = req.body;

        const issue = await prisma.issue.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                jobId: jobId || null,
                title,
                description: description || '',
                severity: severity || 'medium',
                status: status || 'open',
                category: category || 'general',
                assignedTo: assignedTo || null,
                createdBy: req.user.id
            }
        });
        res.status(201).json({ ...issue, _id: issue.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update issue
// @route   PATCH /api/issues/:id
// @access  Private
const updateIssue = async (req, res, next) => {
    try {
        const issue = await prisma.issue.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!issue) {
            res.status(404);
            throw new Error('Issue not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        const updatedIssue = await prisma.issue.update({
            where: { id: req.params.id },
            data
        });

        res.json({ ...updatedIssue, _id: updatedIssue.id });
    } catch (error) {
        next(error);
    }
};

const deleteIssue = async (req, res, next) => {
    try {
        const deleted = await prisma.issue.deleteMany({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (deleted.count === 0) {
            res.status(404);
            throw new Error('Issue not found');
        }
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
