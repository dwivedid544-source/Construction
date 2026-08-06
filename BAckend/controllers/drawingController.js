const prisma = require('../config/prisma');

// @desc    Get all drawings
// @route   GET /api/drawings
// @access  Private
const getDrawings = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.projectId) {
            where.projectId = req.query.projectId;
        }

        const drawings = await prisma.drawing.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(drawings.map(d => ({
            ...d,
            _id: d.id,
            projectId: d.project ? { _id: d.project.id, name: d.project.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new drawing
// @route   POST /api/drawings
// @access  Private
const createDrawing = async (req, res, next) => {
    try {
        const { projectId, title, name } = req.body;
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
                projectId,
                title: title || name || 'Untitled Drawing',
                fileUrl,
                version: 'v1.0',
                uploadedById: req.user._id || req.user.id
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
        let fileUrl = req.body.fileUrl;
        if (req.file) {
            fileUrl = req.file.path.replace(/\\/g, '/');
        }

        if (!fileUrl) {
            res.status(400);
            throw new Error('Please upload a new drawing file');
        }

        const drawing = await prisma.drawing.findUnique({ where: { id: req.params.id } });

        if (!drawing) {
            res.status(404);
            throw new Error('Drawing not found');
        }

        const updated = await prisma.drawing.update({
            where: { id: req.params.id },
            data: {
                fileUrl,
                version: `v${(parseFloat(drawing.version.replace('v', '')) + 0.1).toFixed(1)}`
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
        const drawing = await prisma.drawing.findUnique({ where: { id: req.params.id } });

        if (!drawing) {
            res.status(404);
            throw new Error('Drawing not found');
        }

        await prisma.drawing.delete({ where: { id: req.params.id } });
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
        const annotations = await prisma.drawingAnnotation.findMany({
            where: { drawingId: req.params.id },
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        res.json(annotations.map(a => ({
            ...a,
            _id: a.id,
            userId: a.author ? { _id: a.author.id, fullName: a.author.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create an annotation
// @route   POST /api/drawings/:id/annotations
// @access  Private
const createDrawingAnnotation = async (req, res, next) => {
    try {
        const { type, coords, coordinates, text, content } = req.body;

        const annotation = await prisma.drawingAnnotation.create({
            data: {
                drawingId: req.params.id,
                authorId: req.user._id || req.user.id,
                type: type || 'pin',
                coords: coords || coordinates || {},
                text: text || content || null
            },
            include: { author: { select: { id: true, name: true } } }
        });

        res.status(201).json({
            ...annotation,
            _id: annotation.id,
            userId: annotation.author ? { _id: annotation.author.id, fullName: annotation.author.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an annotation
// @route   PATCH /api/drawings/annotations/:id
// @access  Private
const updateDrawingAnnotation = async (req, res, next) => {
    try {
        const annotation = await prisma.drawingAnnotation.findUnique({ where: { id: req.params.id } });

        if (!annotation) {
            return res.status(404).json({ message: 'Annotation not found' });
        }

        const { text, content, type, coords } = req.body;
        const updateData = {};
        if (text !== undefined || content !== undefined) updateData.text = text || content;
        if (type !== undefined) updateData.type = type;
        if (coords !== undefined) updateData.coords = coords;

        const updated = await prisma.drawingAnnotation.update({
            where: { id: req.params.id },
            data: updateData,
            include: { author: { select: { id: true, name: true } } }
        });

        res.json({
            ...updated,
            _id: updated.id,
            userId: updated.author ? { _id: updated.author.id, fullName: updated.author.name } : null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an annotation
// @route   DELETE /api/drawings/annotations/:id
// @access  Private
const deleteDrawingAnnotation = async (req, res, next) => {
    try {
        const annotation = await prisma.drawingAnnotation.findUnique({ where: { id: req.params.id } });

        if (!annotation) {
            return res.status(404).json({ message: 'Annotation not found' });
        }

        await prisma.drawingAnnotation.delete({ where: { id: req.params.id } });
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
