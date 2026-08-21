const path = require('path');
const prisma = require('../config/prisma');

// @desc    Get all equipment for the company
// @route   GET /api/equipment
// @access  Private
const getEquipment = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        let whereClause = { companyId: userCompanyId };

        if (req.user.role === 'SUBCONTRACTOR') {
            whereClause.NOT = { assignedJobId: null };
        }

        const equipment = await prisma.equipment.findMany({
            where: whereClause,
            include: {
                assignedJob: {
                    select: {
                        name: true,
                        status: true,
                        projectId: true,
                        project: { select: { name: true } }
                    }
                }
            }
        });

        // Mapping for compatibility
        const mapped = equipment.map(eq => ({
            ...eq,
            _id: eq.id,
            assignedJob: eq.assignedJob ? {
                ...eq.assignedJob,
                _id: eq.assignedJobId,
                projectId: eq.assignedJob.project
            } : null
        }));

        res.json(mapped);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private
const createEquipment = async (req, res, next) => {
    try {
        const data = { ...req.body };
        delete data._id;
        delete data.id;

        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const equipment = await prisma.equipment.create({
            data: {
                ...data,
                companyId: userCompanyId,
                createdBy: req.user.id
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
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data,
            include: {
                assignedJob: {
                    select: {
                        name: true,
                        status: true,
                        projectId: true,
                        project: { select: { name: true } }
                    }
                }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            assignedJob: updated.assignedJob ? {
                ...updated.assignedJob,
                _id: updated.assignedJobId,
                projectId: updated.assignedJob.project
            } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private
const deleteEquipment = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }
        await prisma.equipment.delete({
            where: { id: req.params.id }
        });
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
        const { jobId } = req.body;
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');

        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { project: { select: { name: true } } }
        });
        const jobName = job?.name || 'Unknown Job';
        const projectName = job?.project?.name || 'Unknown Project';

        const assignedNow = new Date();
        
        let history = [];
        if (typeof equipment.assignmentHistory === 'string') {
            try { history = JSON.parse(equipment.assignmentHistory); } catch (e) {}
        } else if (Array.isArray(equipment.assignmentHistory)) {
            history = equipment.assignmentHistory;
        }

        history.push({
            jobId,
            jobName,
            projectName,
            assignedDate: assignedNow,
            returnedDate: null
        });

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: {
                assignedJobId: jobId,
                assignedDate: assignedNow,
                status: 'operational',
                assignmentHistory: history
            },
            include: {
                assignedJob: {
                    select: {
                        name: true,
                        status: true,
                        projectId: true,
                        project: { select: { name: true } }
                    }
                }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            assignedJob: updated.assignedJob ? {
                ...updated.assignedJob,
                _id: updated.assignedJobId,
                projectId: updated.assignedJob.project
            } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Return equipment from job
// @route   POST /api/equipment/:id/return
// @access  Private
const returnEquipment = async (req, res, next) => {
    try {
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');

        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        let history = [];
        if (typeof equipment.assignmentHistory === 'string') {
            try { history = JSON.parse(equipment.assignmentHistory); } catch (e) {}
        } else if (Array.isArray(equipment.assignmentHistory)) {
            history = equipment.assignmentHistory;
        }

        const openRecord = [...history].reverse().find(h => !h.returnedDate);
        if (openRecord) {
            openRecord.returnedDate = new Date();
        }

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: {
                assignedJobId: null,
                assignedDate: null,
                status: 'idle',
                assignmentHistory: history
            }
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
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }
        
        let history = [];
        if (typeof equipment.assignmentHistory === 'string') {
            try { history = JSON.parse(equipment.assignmentHistory); } catch (e) {}
        } else if (Array.isArray(equipment.assignmentHistory)) {
            history = equipment.assignmentHistory;
        }

        res.json({
            _id: equipment.id,
            name: equipment.name,
            model: equipment.model,
            serialNumber: equipment.serialNumber,
            history: [...history].reverse()
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
        const equipment = await prisma.equipment.findUnique({
            where: { id: req.params.id }
        });
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        if (!equipment || String(equipment.companyId) !== userCompanyId) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        if (!req.file) {
            res.status(400);
            throw new Error('No image file provided');
        }

        let imageUrl = req.file.path;
        if (req.file.filename) {
            imageUrl = `/uploads/photos/${req.file.filename}`;
        } else if (req.file.path && !req.file.path.startsWith('http')) {
            const fname = path.basename(req.file.path);
            imageUrl = `/uploads/photos/${fname}`;
        }

        const updated = await prisma.equipment.update({
            where: { id: req.params.id },
            data: { imageUrl }
        });

        res.json({ imageUrl: updated.imageUrl });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ALL equipment assignment history (company-wide)
// @route   GET /api/equipment/all-history
// @access  Private
const getAllEquipmentHistory = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const allEquipment = await prisma.equipment.findMany({
            where: { companyId: userCompanyId }
        });

        const allHistory = [];
        for (const eq of allEquipment) {
            let history = [];
            if (typeof eq.assignmentHistory === 'string') {
                try { history = JSON.parse(eq.assignmentHistory); } catch (e) {}
            } else if (Array.isArray(eq.assignmentHistory)) {
                history = eq.assignmentHistory;
            }

            for (const h of history) {
                allHistory.push({
                    equipmentId: eq.id,
                    equipmentName: eq.name,
                    serialNumber: eq.serialNumber,
                    jobName: h.jobName,
                    projectName: h.projectName,
                    assignedDate: h.assignedDate,
                    returnedDate: h.returnedDate,
                    notes: h.notes
                });
            }
        }

        allHistory.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));

        res.json(allHistory);
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
