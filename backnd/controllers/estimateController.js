const prisma = require('../config/prisma');

// @desc    Get all estimates
// @route   GET /api/estimates
// @access  Private
const getEstimates = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };
        if (req.query.projectId) whereClause.projectId = req.query.projectId;

        const estimates = await prisma.estimate.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                creator: { select: { fullName: true } }
            }
        });

        const mapped = estimates.map(e => ({
            ...e,
            _id: e.id,
            projectId: e.project,
            createdBy: e.creator
        }));

        res.json(mapped);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new estimate
// @route   POST /api/estimates
// @access  Private (PM, Owners)
const createEstimate = async (req, res, next) => {
    try {
        const { projectId, clientName, amount, items, status } = req.body;

        const estimate = await prisma.estimate.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                clientName: clientName || '',
                amount: amount ? Number(amount) : 0,
                items: typeof items === 'string' ? JSON.parse(items) : (items || {}),
                status: status || 'draft',
                createdBy: req.user.id
            }
        });
        res.status(201).json({ ...estimate, _id: estimate.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update estimate status
// @route   PATCH /api/estimates/:id
// @access  Private
const updateEstimate = async (req, res, next) => {
    try {
        const estimate = await prisma.estimate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!estimate) {
            res.status(404);
            throw new Error('Estimate not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.amount) data.amount = Number(data.amount);
        if (data.items) {
            data.items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
        }

        const updatedEstimate = await prisma.estimate.update({
            where: { id: req.params.id },
            data
        });

        res.json({ ...updatedEstimate, _id: updatedEstimate.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete estimate
// @route   DELETE /api/estimates/:id
// @access  Private (PM, Owners)
const deleteEstimate = async (req, res, next) => {
    try {
        const estimate = await prisma.estimate.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!estimate) {
            res.status(404);
            throw new Error('Estimate not found');
        }

        await prisma.estimate.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Estimate deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEstimates,
    createEstimate,
    updateEstimate,
    deleteEstimate
};
