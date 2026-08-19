const prisma = require('../config/prisma');

exports.createDocument = async (req, res) => {
    try {
        const { projectId, title, description, category } = req.body;
        const fileUrl = req.file ? req.file.path : null;

        if (!fileUrl) {
            return res.status(400).json({ message: 'File is required' });
        }

        const newDoc = await prisma.projectDocument.create({
            data: {
                projectId,
                title,
                description: description || '',
                category: category || 'General',
                fileUrl,
                uploadedBy: req.user.id,
                companyId: req.user.companyId
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
            include: { uploader: { select: { fullName: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(documents.map(doc => ({
            ...doc,
            _id: doc.id,
            uploadedBy: doc.uploader
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.projectDocument.delete({
            where: { id }
        });
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
