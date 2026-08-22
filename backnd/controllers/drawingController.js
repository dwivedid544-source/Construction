const prisma = require('../config/prisma');

// @desc    Get all drawings
// @route   GET /api/drawings
// @access  Private
const getDrawings = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };

        // For CLIENT role, filter to their assigned projects
        if (req.user.role === 'CLIENT') {
            const clientProjects = await prisma.project.findMany({
                where: { clientId: req.user.id, companyId: req.user.companyId },
                select: { id: true }
            });
            const projectIds = clientProjects.map(p => p.id);
            if (projectIds.length > 0) {
                whereClause.projectId = { in: projectIds };
            }
        }

        if (req.query.projectId) {
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
        console.error('getDrawings error:', error);
        next(error);
    }
};

// @desc    Create new drawing
// @route   POST /api/drawings
// @access  Private
const createDrawing = async (req, res, next) => {
    try {
        const { projectId, title, drawingNumber, category, status } = req.body;
        let fileUrl = req.body.fileUrl;

        if (req.file) {
            fileUrl = req.file.path ? req.file.path.replace(/\\/g, '/') : (req.file.url || req.file.location || req.file.filename);
        }

        if (!fileUrl) {
            return res.status(400).json({ message: 'Please upload a drawing file' });
        }

        const drawingData = {
            companyId: req.user.companyId,
            projectId,
            title: title || 'Untitled Drawing',
            number: drawingNumber || '',
            drawingNumber: drawingNumber || '',
            category: category || 'Architectural',
            fileUrl,
            version: '1.0',
            currentVersion: 1,
            status: status || 'Active',
            versions: [{
                versionNumber: 1,
                version: '1.0',
                fileUrl,
                uploadedBy: req.user.id || req.user._id,
                uploadedAt: new Date(),
                description: 'Initial upload'
            }]
        };

        const drawing = await prisma.drawing.create({
            data: drawingData
        });

        res.status(201).json({ ...drawing, _id: drawing.id || drawing._id });
    } catch (error) {
        console.error('createDrawing error:', error);
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
            fileUrl = req.file.path ? req.file.path.replace(/\\/g, '/') : (req.file.url || req.file.location || req.file.filename);
        }

        if (!fileUrl) {
            return res.status(400).json({ message: 'Please upload a new drawing file' });
        }

        const drawing = await prisma.drawing.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!drawing) {
            return res.status(404).json({ message: 'Drawing not found' });
        }

        const currentVerNum = parseFloat(drawing.version || '1.0') || 1.0;
        const newVer = (currentVerNum + 1.0).toFixed(1);

        const newVersionEntry = {
            versionNumber: Math.round(currentVerNum + 1),
            version: newVer.toString(),
            fileUrl,
            uploadedBy: req.user.id || req.user._id,
            uploadedAt: new Date(),
            description: description || `Version ${newVer}`
        };

        const existingVersions = Array.isArray(drawing.versions) ? [...drawing.versions] : [];
        existingVersions.push(newVersionEntry);

        const updated = await prisma.drawing.update({
            where: { id: req.params.id },
            data: {
                version: newVer.toString(),
                currentVersion: Math.round(currentVerNum + 1),
                fileUrl,
                versions: existingVersions
            }
        });

        res.status(201).json({ ...updated, _id: updated.id || updated._id });
    } catch (error) {
        console.error('addDrawingVersion error:', error);
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
        const { type, coordinates, content, pageNumber, isVisibleToClient, status, versionId } = req.body;

        const annotation = await prisma.drawingAnnotation.create({
            data: {
                drawingId: req.params.id,
                versionId: versionId || undefined,
                userId: req.user.id || req.user._id,
                userName: req.user.fullName || req.user.name || 'Team Member',
                userRole: req.user.role || 'Member',
                pageNumber: Number(pageNumber) || 1,
                type: type || 'comment',
                coordinates: coordinates || {},
                content: content || '',
                status: status || 'open',
                isVisibleToClient: isVisibleToClient !== undefined ? Boolean(isVisibleToClient) : true,
                data: req.body
            }
        });

        res.status(201).json({ ...annotation, _id: annotation.id || annotation._id });
    } catch (error) {
        console.error('createDrawingAnnotation error:', error);
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

        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;

        const updated = await prisma.drawingAnnotation.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ ...updated, _id: updated.id || updated._id });
    } catch (error) {
        console.error('updateDrawingAnnotation error:', error);
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
        console.error('deleteDrawingAnnotation error:', error);
        next(error);
    }
};

// @desc    Update drawing details (status, title, drawingNumber, category, projectId)
// @route   PATCH /api/drawings/:id
// @access  Private (Admin, PM, Engineer)
const updateDrawing = async (req, res, next) => {
    try {
        const { title, drawingNumber, number, category, status, projectId } = req.body;
        
        const drawing = await prisma.drawing.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!drawing) {
            return res.status(404).json({ message: 'Drawing not found' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (drawingNumber !== undefined) {
            updateData.drawingNumber = drawingNumber;
            updateData.number = drawingNumber;
        }
        if (number !== undefined) {
            updateData.number = number;
            updateData.drawingNumber = number;
        }
        if (category !== undefined) updateData.category = category;
        if (status !== undefined) updateData.status = status;
        if (projectId !== undefined) updateData.projectId = projectId;

        const updated = await prisma.drawing.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ ...updated, _id: updated.id || updated._id });
    } catch (error) {
        console.error('updateDrawing error:', error);
        next(error);
    }
};

module.exports = {
    getDrawings,
    createDrawing,
    updateDrawing,
    addDrawingVersion,
    deleteDrawing,
    getDrawingAnnotations,
    createDrawingAnnotation,
    updateDrawingAnnotation,
    deleteDrawingAnnotation
};
