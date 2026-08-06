const prisma = require('../config/prisma');

// @desc    Get all active plans
// @route   GET /api/plans
// @access  Public
const getPlans = async (req, res, next) => {
    try {
        const plans = await prisma.plan.findMany({ orderBy: { price: 'asc' } });
        res.json(plans.map(p => ({ ...p, _id: p.id })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new plan
// @route   POST /api/plans
// @access  Private (Super Admin)
const createPlan = async (req, res, next) => {
    try {
        const plan = await prisma.plan.create({ data: req.body });
        res.status(201).json({ ...plan, _id: plan.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a plan
// @route   PATCH /api/plans/:id
// @access  Private (Super Admin)
const updatePlan = async (req, res, next) => {
    try {
        const plan = await prisma.plan.update({
            where: { id: req.params.id },
            data: req.body
        });
        if (!plan) {
            res.status(404);
            throw new Error('Plan not found');
        }
        res.json({ ...plan, _id: plan.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a plan
// @route   DELETE /api/plans/:id
// @access  Private (Super Admin)
const deletePlan = async (req, res, next) => {
    try {
        const plan = await prisma.plan.delete({
            where: { id: req.params.id }
        });
        if (!plan) {
            res.status(404);
            throw new Error('Plan not found');
        }
        res.json({ message: 'Plan deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan
};
