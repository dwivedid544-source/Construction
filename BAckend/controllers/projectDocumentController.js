const prisma = require('../config/prisma');

exports.createDocument = async (req, res) => {
    try {
        const { projectId, title, name, description, fileType } = req.body;
        const fileUrl = req.file ? req.file.path : (req.body.fileUrl || null);

        if (!fileUrl) {
            return res.status(400).json({ message: 'File is required' });
        }

        const newDoc = await prisma.projectDocument.create({
            data: {
                projectId,
                name: title || name || 'Untitled Document',
                fileUrl,
                fileType: fileType || null,
                uploadedById: req.user._id || req.user.id
            }
        });

        res.status(201).json({ ...newDoc, _id: newDoc.id });
    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getProjectDocuments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const documents = await prisma.projectDocument.findMany({
            where: { projectId },
            include: { uploadedBy: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(documents.map(d => ({
            ...d,
            _id: d.id,
            uploadedBy: d.uploadedBy ? { _id: d.uploadedBy.id, fullName: d.uploadedBy.name, email: d.uploadedBy.email } : null
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.projectDocument.delete({ where: { id } });
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
