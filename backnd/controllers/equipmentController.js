const path = require('path');
const Equipment = require('../models/Equipment');
const Job = require('../models/Job');

// Helper to format equipment object consistently
const formatEquipment = (eq) => {
    if (!eq) return null;
    const doc = eq.toObject ? eq.toObject() : { ...eq };
    const idStr = (doc._id || doc.id).toString();

    let assignedJobObj = null;
    let assignedJobId = null;

    if (doc.assignedJob) {
        if (typeof doc.assignedJob === 'object' && doc.assignedJob !== null) {
            const jId = (doc.assignedJob._id || doc.assignedJob.id || '').toString();
            assignedJobId = jId;
            assignedJobObj = {
                ...doc.assignedJob,
                _id: jId,
                id: jId,
                name: doc.assignedJob.name,
                status: doc.assignedJob.status,
                projectId: doc.assignedJob.projectId
            };
        } else {
            assignedJobId = doc.assignedJob.toString();
            assignedJobObj = {
                _id: assignedJobId,
                id: assignedJobId
            };
        }
    }

    return {
        ...doc,
        _id: idStr,
        id: idStr,
        assignedJobId: assignedJobId,
        assignedJob: assignedJobObj
    };
};

// @desc    Get all equipment for the company
// @route   GET /api/equipment
// @access  Private
const getEquipment = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        let whereClause = { companyId: userCompanyId };

        if (req.user.role === 'SUBCONTRACTOR') {
            whereClause.assignedJob = { $ne: null };
        }

        const equipmentList = await Equipment.find(whereClause)
            .populate({
                path: 'assignedJob',
                select: 'name status projectId',
                populate: { path: 'projectId', select: 'name' }
            })
            .sort({ createdAt: -1 })
            .lean();

        const mapped = equipmentList.map(formatEquipment);
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
        const equipment = await Equipment.create({
            ...data,
            companyId: userCompanyId,
            createdBy: req.user.id || req.user._id
        });

        res.status(201).json(formatEquipment(equipment));
    } catch (error) {
        next(error);
    }
};

// @desc    Update equipment
// @route   PATCH /api/equipment/:id
// @access  Private
const updateEquipment = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const equipment = await Equipment.findOne({
            _id: req.params.id,
            companyId: userCompanyId
        });

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.assignedJobId !== undefined) {
            data.assignedJob = data.assignedJobId || null;
            delete data.assignedJobId;
        }

        Object.assign(equipment, data);
        await equipment.save();

        const populated = await Equipment.findById(equipment._id)
            .populate({
                path: 'assignedJob',
                select: 'name status projectId',
                populate: { path: 'projectId', select: 'name' }
            })
            .lean();

        res.json(formatEquipment(populated));
    } catch (error) {
        next(error);
    }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private
const deleteEquipment = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const deleted = await Equipment.findOneAndDelete({
            _id: req.params.id,
            companyId: userCompanyId
        });

        if (!deleted) {
            res.status(404);
            throw new Error('Equipment not found');
        }

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
        const userCompanyId = String(req.user.companyId || req.companyId || '');

        const equipment = await Equipment.findOne({
            _id: req.params.id,
            companyId: userCompanyId
        });

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        const job = await Job.findById(jobId).populate('projectId', 'name');
        const jobName = job?.name || 'Unknown Job';
        const projectName = job?.projectId?.name || job?.project?.name || 'Unknown Project';

        const assignedNow = new Date();
        
        let history = Array.isArray(equipment.assignmentHistory) ? equipment.assignmentHistory : [];

        history.push({
            jobId,
            jobName,
            projectName,
            assignedDate: assignedNow,
            returnedDate: null
        });

        equipment.assignedJob = jobId;
        equipment.assignedDate = assignedNow;
        equipment.status = 'operational';
        equipment.assignmentHistory = history;

        await equipment.save();

        const populated = await Equipment.findById(equipment._id)
            .populate({
                path: 'assignedJob',
                select: 'name status projectId',
                populate: { path: 'projectId', select: 'name' }
            })
            .lean();

        res.json(formatEquipment(populated));
    } catch (error) {
        console.error('assignEquipment error:', error);
        next(error);
    }
};

// @desc    Return equipment from job
// @route   POST /api/equipment/:id/return
// @access  Private
const returnEquipment = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const equipment = await Equipment.findOne({
            _id: req.params.id,
            companyId: userCompanyId
        });

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }

        let history = Array.isArray(equipment.assignmentHistory) ? equipment.assignmentHistory : [];

        const openRecord = [...history].reverse().find(h => !h.returnedDate);
        if (openRecord) {
            openRecord.returnedDate = new Date();
        }

        equipment.assignedJob = null;
        equipment.assignedDate = null;
        equipment.status = 'idle';
        equipment.assignmentHistory = history;

        await equipment.save();

        res.json(formatEquipment(equipment));
    } catch (error) {
        console.error('returnEquipment error:', error);
        next(error);
    }
};

// @desc    Get assignment history for one equipment
// @route   GET /api/equipment/:id/history
// @access  Private
const getEquipmentHistory = async (req, res, next) => {
    try {
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const equipment = await Equipment.findOne({
            _id: req.params.id,
            companyId: userCompanyId
        }).lean();

        if (!equipment) {
            res.status(404);
            throw new Error('Equipment not found');
        }
        
        let history = Array.isArray(equipment.assignmentHistory) ? equipment.assignmentHistory : [];

        res.json({
            _id: equipment._id.toString(),
            id: equipment._id.toString(),
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
        const userCompanyId = String(req.user.companyId || req.companyId || '');
        const equipment = await Equipment.findOne({
            _id: req.params.id,
            companyId: userCompanyId
        });

        if (!equipment) {
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

        equipment.imageUrl = imageUrl;
        await equipment.save();

        res.json({ imageUrl: equipment.imageUrl });
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
        const allEquipment = await Equipment.find({ companyId: userCompanyId }).lean();

        const allHistory = [];
        for (const eq of allEquipment) {
            let history = Array.isArray(eq.assignmentHistory) ? eq.assignmentHistory : [];

            for (const h of history) {
                allHistory.push({
                    equipmentId: eq._id.toString(),
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
