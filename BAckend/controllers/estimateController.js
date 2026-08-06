const prisma = require('../config/prisma');

// @desc    Get all estimates
// @route   GET /api/estimates
// @access  Private
const getEstimates = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };
        if (req.query.projectId) where.projectId = req.query.projectId;

        const estimates = await prisma.estimate.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(estimates.map(e => ({
            ...e,
            _id: e.id,
            projectId: e.project ? { _id: e.project.id, name: e.project.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new estimate
// @route   POST /api/estimates
// @access  Private (PM, Owners)
const createEstimate = async (req, res, next) => {
    try {
        const { projectId, estimateNumber, totalAmount, status } = req.body;

        const estimate = await prisma.estimate.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                estimateNumber: estimateNumber || `EST-${Date.now()}`,
                totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
                status: status || 'DRAFT'
            },
            include: {
                project: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...estimate,
            _id: estimate.id,
            projectId: estimate.project ? { _id: estimate.project.id, name: estimate.project.name } : null
        });
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

        const { estimateNumber, totalAmount, status } = req.body;
        const updateData = {};
        if (estimateNumber !== undefined) updateData.estimateNumber = estimateNumber;
        if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
        if (status !== undefined) updateData.status = status;

        const updatedEstimate = await prisma.estimate.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedEstimate,
            _id: updatedEstimate.id,
            projectId: updatedEstimate.project ? { _id: updatedEstimate.project.id, name: updatedEstimate.project.name } : null
        });
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

        await prisma.estimate.delete({ where: { id: req.params.id } });
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
