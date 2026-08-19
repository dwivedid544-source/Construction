const prisma = require('../config/prisma');

// @desc    Get all drawings
// @route   GET /api/drawings
// @access  Private
const getDrawings = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };

        if (['PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(req.user.role)) {
            const jobFilter = { companyId: req.user.companyId };

            if (req.user.role === 'PM') {
                jobFilter.OR = [
                    { foremanId: req.user.id },
                    { createdBy: req.user.id }
                ];
            } else if (['FOREMAN', 'SUBCONTRACTOR'].includes(req.user.role)) {
                jobFilter.foremanId = req.user.id;
            } else {
                jobFilter.assignedWorkers = { some: { id: req.user.id } };
            }

            const assignedJobs = await prisma.job.findMany({
                where: jobFilter,
                select: { projectId: true }
            });
            const jobProjectIds = assignedJobs.map(j => j.projectId).filter(Boolean);

            let finalAllowedProjectIds = jobProjectIds;

            if (req.user.role === 'PM') {
                const directProjects = await prisma.project.findMany({
                    where: {
                        companyId: req.user.companyId,
                        OR: [
                            { pms: { some: { id: req.user.id } } },
                            { pmId: req.user.id },
                            { createdBy: req.user.id }
                        ]
                    },
                    select: { id: true }
                });
                const directProjectIds = directProjects.map(p => p.id);
                finalAllowedProjectIds = Array.from(new Set([...jobProjectIds, ...directProjectIds]));
            }

            whereClause.projectId = { in: finalAllowedProjectIds };

        } else if (req.user.role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { clientId: req.user.id },
                select: { id: true }
            });
            const projectIds = clientProjects.map(p => p.id);
            whereClause.projectId = { in: projectIds };
        }

        if (req.query.projectId) {
            if (['CLIENT', 'PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(req.user.role)) {
                const allowedIds = whereClause.projectId?.in || [];
                if (!allowedIds.includes(req.query.projectId)) {
                    return res.status(403).json({ message: 'Not authorized to access this project drawings' });
                }
            }
            whereClause.projectId = req.query.projectId;
        }

        const drawings = await prisma.drawing.findMany({
            where: whereClause,
            include: { project: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const mappedDrawings = drawings.map(d => ({
            ...d,
            _id: d.id,
            projectId: d.project
        }));

        res.json(mappedDrawings);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new drawing
// @route   POST /api/drawings
// @access  Private
const createDrawing = async (req, res, next) => {
    try {
        const { projectId, title, drawingNumber, category } = req.body;
        let fileUrl = req.body.fileUrl;

        if (req.file) {
            fileUrl = req.file.path.replace(/\\/g, '/');
        }

        if (!fileUrl) {
            res.status(400);
            throw new Error('Please upload a drawing file');
        }

        const drawing = await prisma.drawing.create({
            data: {
                companyId: req.user.companyId,
                projectId,
                title,
                number: drawingNumber || '',
                fileUrl,
                version: '1.0'
            }
        });

        res.status(201).json({ ...drawing, _id: drawing.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Add new version to drawing
// @route   POST /api/drawings/:id/versions
// @access  Private
const addDrawingVersion = async (req, res, next) => {
    try {
        const { description } = req.body;
        let fileUrl = req.body.fileUrl;

        if (req.file) {
            fileUrl = req.file.path.replace(/\\/g, '/');
        }

        if (!fileUrl) {
            res.status(400);
            throw new Error('Please upload a new drawing file');
        }

        const drawing = await prisma.drawing.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!drawing) {
            res.status(404);
            throw new Error('Drawing not found');
        }

        // Parse versions or update the version field
        const newVer = (parseFloat(drawing.version) + 1.0).toFixed(1);

        const updated = await prisma.drawing.update({
            where: { id: req.params.id },
            data: {
                version: newVer.toString(),
                fileUrl
            }
        });

        res.status(201).json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete drawing
// @route   DELETE /api/drawings/:id
// @access  Private
const deleteDrawing = async (req, res, next) => {
    try {
        const deleted = await prisma.drawing.deleteMany({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (deleted.count === 0) {
            res.status(404);
            throw new Error('Drawing not found');
        }

        res.json({ message: 'Drawing removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get annotations for a drawing version
// @route   GET /api/drawings/:id/annotations
// @access  Private
const getDrawingAnnotations = async (req, res, next) => {
    try {
        const whereClause = { drawingId: req.params.id };

        const annotations = await prisma.drawingAnnotation.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' }
        });

        const mappedAnnotations = annotations.map(a => ({
            ...a,
            _id: a.id
        }));

        res.json(mappedAnnotations);
    } catch (error) {
        next(error);
    }
};

// @desc    Create an annotation
// @route   POST /api/drawings/:id/annotations
// @access  Private
const createDrawingAnnotation = async (req, res, next) => {
    try {
        const { coordinates, content } = req.body;

        const annotation = await prisma.drawingAnnotation.create({
            data: {
                drawingId: req.params.id,
                data: typeof coordinates === 'object' ? coordinates : { content }
            }
        });

        res.status(201).json({ ...annotation, _id: annotation.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an annotation
// @route   PATCH /api/drawings/annotations/:id
// @access  Private
const updateDrawingAnnotation = async (req, res, next) => {
    try {
        const annotation = await prisma.drawingAnnotation.findUnique({
            where: { id: req.params.id }
        });

        if (!annotation) {
            return res.status(404).json({ message: 'Annotation not found' });
        }

        const updated = await prisma.drawingAnnotation.update({
            where: { id: req.params.id },
            data: {
                data: req.body
            }
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an annotation
// @route   DELETE /api/drawings/annotations/:id
// @access  Private
const deleteDrawingAnnotation = async (req, res, next) => {
    try {
        await prisma.drawingAnnotation.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Annotation removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDrawings,
    createDrawing,
    addDrawingVersion,
    deleteDrawing,
    getDrawingAnnotations,
    createDrawingAnnotation,
    updateDrawingAnnotation,
    deleteDrawingAnnotation
};
