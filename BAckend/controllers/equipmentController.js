const prisma = require('../config/prisma');

// @desc    Get all equipment for the company
// @route   GET /api/equipment
// @access  Private
const getEquipment = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        const equipment = await prisma.equipment.findMany({
            where,
            include: { project: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(equipment.map(e => ({
            ...e,
            _id: e.id,
            assignedJob: e.project ? { _id: e.project.id, name: e.project.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private
const createEquipment = async (req, res, next) => {
    try {
        const { name, serialNumber, category, status, dailyRate, projectId } = req.body;

        const equipment = await prisma.equipment.create({
            data: {
                companyId: req.user.companyId,
                projectId: projectId || null,
                name: name || 'Untitled Equipment',
                serialNumber: serialNumber || null,
                category: category || null,
                status: status || 'AVAILABLE',
                dailyRate: dailyRate ? parseFloat(dailyRate) : 0
            }
        });

        res.status(201).json({ ...equipment, _id: equipment.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update equipment
// @route   PATCH /api/equipment/:id
// @access  Private
const updateEquipment = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const { name, serialNumber, category, status, dailyRate, projectId } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
        if (category !== undefined) updateData.category = category;
        if (status !== undefined) updateData.status = status;
        if (dailyRate !== undefined) updateData.dailyRate = parseFloat(dailyRate);
        if (projectId !== undefined) updateData.projectId = projectId;

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: updateData,
            include: { project: { select: { id: true, name: true } } }
        });

        res.json({ ...updated, _id: updated.id, assignedJob: updated.project ? { _id: updated.project.id, name: updated.project.name } : null });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private
const deleteEquipment = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        await prisma.equipment.delete({ where: { id: req.params.id } });
        res.json({ message: 'Equipment removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign equipment to job
// @route   POST /api/equipment/:id/assign
// @access  Private
const assignEquipment = async (req, res, next) => {
    try {
        const { projectId } = req.body;
        const equipment = await prisma.equipment.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: { projectId, status: 'IN_USE' },
            include: { project: { select: { id: true, name: true } } }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Return equipment from job
// @route   POST /api/equipment/:id/return
// @access  Private
const returnEquipment = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: { projectId: null, status: 'AVAILABLE' }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Get assignment history for one equipment
// @route   GET /api/equipment/:id/history
// @access  Private
const getEquipmentHistory = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }
        res.json({
            _id: equipment.id,
            name: equipment.name,
            category: equipment.category,
            serialNumber: equipment.serialNumber,
            history: []
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload equipment image
// @route   POST /api/equipment/:id/upload-image
// @access  Private
const uploadEquipmentImage = async (req, res, next) => {
    try {
        res.json({ imageUrl: '' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ALL equipment assignment history (company-wide)
// @route   GET /api/equipment/all-history
// @access  Private
const getAllEquipmentHistory = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    assignEquipment,
    returnEquipment,
    uploadEquipmentImage,
    getEquipmentHistory,
    getAllEquipmentHistory
};
