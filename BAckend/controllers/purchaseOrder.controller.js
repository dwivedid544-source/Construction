const prisma = require('../config/prisma');

// Create PO
exports.createPO = async (req, res) => {
    try {
        const { projectId, vendorId, totalAmount, status } = req.body;

        const count = await prisma.purchaseOrder.count({ where: { companyId: req.user.companyId } });
        const poNumber = `PO-${String(count + 1).padStart(6, '0')}`;

        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                companyId: req.user.companyId,
                projectId,
                vendorId: vendorId || null,
                totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
                status: status || 'DRAFT'
            },
            include: {
                project: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...po,
            _id: po.id,
            projectId: po.project ? { _id: po.project.id, name: po.project.name } : null,
            vendorId: po.vendor ? { _id: po.vendor.id, name: po.vendor.name } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All POs with Filters
exports.getAllPOs = async (req, res) => {
    try {
        const { projectId, vendorId, status } = req.query;
        const where = { companyId: req.user.companyId };

        if (projectId) where.projectId = projectId;
        if (vendorId) where.vendorId = vendorId;
        if (status) where.status = status;

        const pos = await prisma.purchaseOrder.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(pos.map(po => ({
            ...po,
            _id: po.id,
            projectId: po.project ? { _id: po.project.id, name: po.project.name } : null,
            vendorId: po.vendor ? { _id: po.vendor.id, name: po.vendor.name } : null
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single PO
exports.getSinglePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId },
            include: {
                project: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } }
            }
        });

        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
        res.json({
            ...po,
            _id: po.id,
            projectId: po.project ? { _id: po.project.id, name: po.project.name } : null,
            vendorId: po.vendor ? { _id: po.vendor.id, name: po.vendor.name } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update PO
exports.updatePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const { totalAmount, status, vendorId } = req.body;
        const updateData = {};
        if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
        if (status !== undefined) updateData.status = status;
        if (vendorId !== undefined) updateData.vendorId = vendorId;

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updated,
            _id: updated.id,
            projectId: updated.project ? { _id: updated.project.id, name: updated.project.name } : null,
            vendorId: updated.vendor ? { _id: updated.vendor.id, name: updated.vendor.name } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Status Actions
exports.approvePO = async (req, res) => {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'APPROVED' }
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendToVendor = async (req, res) => {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'SENT' }
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markDelivered = async (req, res) => {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'DELIVERED' }
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.closePO = async (req, res) => {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'CLOSED' }
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelPO = async (req, res) => {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' }
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete PO
exports.deletePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
        res.json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
