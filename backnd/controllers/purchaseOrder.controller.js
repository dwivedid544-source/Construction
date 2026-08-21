const prisma = require('../config/prisma');

// Helper: Emit Socket.io events across company
const emitSocketEvent = (req, event, data) => {
    try {
        const io = req.app.get('io') || req.app.get('socketio');
        if (io) {
            const companyId = data?.companyId || req.user?.companyId;
            if (companyId) {
                io.to(`company_${companyId}`).emit(event, data);
            }
            io.emit(event, data);
        }
    } catch (err) {
        console.error('Socket emission error in purchaseOrder.controller:', err);
    }
};

// Create PO
exports.createPO = async (req, res) => {
    try {
        const { projectId, jobId, vendorId, vendorName, vendorEmail, items, notesToVendor, internalNotes, expectedDeliveryDate, totalAmount, subtotal, tax } = req.body;
        
        const cleanVendorId = vendorId || null;
        const cleanJobId = jobId || null;

        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        }

        // Generate unique PO Number safely
        const totalCount = await prisma.purchaseOrder.count();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const poNumber = `PO-${String(totalCount + 1).padStart(4, '0')}-${randomSuffix}`;

        let status = 'Draft';
        if (req.user.role === 'PM' || req.user.role === 'COMPANY_OWNER') {
            status = 'Pending Approval';
        } else if (req.user.role === 'FOREMAN') {
            status = 'Draft';
        }

        const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);
        const calcSubtotal = subtotal !== undefined && subtotal !== null ? Number(subtotal) : parsedItems.reduce((s, i) => s + (Number(i.quantity || 1) * Number(i.unitPrice || 0)), 0);
        const calcTax = tax !== undefined && tax !== null ? Number(tax) : calcSubtotal * 0.15;
        const calcTotalAmount = totalAmount !== undefined && totalAmount !== null ? Number(totalAmount) : (calcSubtotal + calcTax);

        const po = await prisma.purchaseOrder.create({
            data: {
                companyId: req.user.companyId,
                poNumber,
                projectId,
                jobId: cleanJobId,
                vendorId: cleanVendorId,
                vendorName: vendorName || 'General Vendor',
                vendorEmail: vendorEmail || 'vendor@example.com',
                createdBy: req.user.id,
                items: parsedItems,
                notesToVendor: notesToVendor || '',
                internalNotes: internalNotes || '',
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                status,
                subtotal: calcSubtotal,
                tax: calcTax,
                totalAmount: calcTotalAmount
            },
            include: {
                project: { select: { name: true } },
                vendor: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            }
        });

        const formatted = { ...po, _id: po.id, projectId: po.project ? { _id: po.projectId, name: po.project.name } : po.projectId, vendorId: po.vendor ? { _id: po.vendorId, name: po.vendor.name } : po.vendorId };
        emitSocketEvent(req, 'po_created', formatted);
        emitSocketEvent(req, 'purchase_order_update', { action: 'created', po: formatted });

        res.status(201).json(formatted);
    } catch (error) {
        console.error('Error creating PO:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get All POs with Filters
exports.getAllPOs = async (req, res) => {
    try {
        const { projectId, jobId, vendorId, status, startDate, endDate } = req.query;
        const whereClause = { companyId: req.user.companyId };

        if (req.user.role === 'FOREMAN') {
            whereClause.createdBy = req.user.id;
        }

        if (projectId) whereClause.projectId = projectId;
        if (jobId) whereClause.jobId = jobId;
        if (vendorId) whereClause.vendorId = vendorId;
        if (status) whereClause.status = status;
        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const pos = await prisma.purchaseOrder.findMany({
            where: whereClause,
            include: {
                project: { select: { name: true } },
                vendor: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(pos.map(po => ({
            ...po,
            _id: po.id,
            projectId: po.projectId || po.project || null,
            vendorId: po.vendorId || po.vendor || null,
            createdBy: po.createdBy || po.creator || null
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single PO
exports.getSinglePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: {
                company: true,
                project: true,
                vendor: true,
                creator: { select: { fullName: true, role: true } }
            }
        });

        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
        res.json({
            ...po,
            _id: po.id,
            companyId: po.companyId || po.company || null,
            projectId: po.projectId || po.project || null,
            vendorId: po.vendorId || po.vendor || null,
            createdBy: po.createdBy || po.creator || null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update PO
exports.updatePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id }
        });
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const isStatusOnly = Object.keys(req.body).length === 1 && (req.body.status !== undefined);
        const isAdminOrPM = req.user.role === 'COMPANY_OWNER' || req.user.role === 'PM';

        if (!isStatusOnly) {
            const isDraft = po.status === 'Draft';
            const canManagerEdit = isAdminOrPM && ['Pending Approval', 'Approved'].includes(po.status);
            
            if (!isDraft && !canManagerEdit) {
                return res.status(400).json({ message: `Cannot edit Purchase Order in ${po.status} status` });
            }
        }

        if (isStatusOnly && !isAdminOrPM && po.status !== 'Draft') {
            return res.status(403).json({ message: 'Only Admins/PMs can change status after submission' });
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.vendorId === '') data.vendorId = null;
        if (data.jobId === '') data.jobId = null;
        if (data.expectedDeliveryDate) data.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
        if (data.subtotal) data.subtotal = Number(data.subtotal);
        if (data.tax) data.tax = Number(data.tax);
        if (data.totalAmount) data.totalAmount = Number(data.totalAmount);
        if (data.items) {
            data.items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data,
            include: {
                project: { select: { name: true } },
                vendor: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            }
        });

        const formatted = { ...updated, _id: updated.id, projectId: updated.project ? { _id: updated.projectId, name: updated.project.name } : updated.projectId, vendorId: updated.vendor ? { _id: updated.vendorId, name: updated.vendor.name } : updated.vendorId };
        emitSocketEvent(req, 'po_updated', formatted);
        emitSocketEvent(req, 'purchase_order_update', { action: 'updated', po: formatted });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateStatus = async (req, res, newStatus, additionalData = {}) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id }
        });
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const isAuthorized = req.user.role === 'COMPANY_OWNER' || req.user.role === 'PM';
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Only Admin/PM can perform this action' });
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: {
                status: newStatus,
                ...additionalData
            },
            include: {
                project: { select: { name: true } },
                vendor: { select: { name: true } },
                creator: { select: { fullName: true, role: true } }
            }
        });

        const formatted = { ...updated, _id: updated.id, projectId: updated.project ? { _id: updated.projectId, name: updated.project.name } : updated.projectId, vendorId: updated.vendor ? { _id: updated.vendorId, name: updated.vendor.name } : updated.vendorId };
        emitSocketEvent(req, 'po_updated', formatted);
        emitSocketEvent(req, 'purchase_order_update', { action: 'updated', po: formatted });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.approvePO = (req, res) => updateStatus(req, res, 'Approved', { approvedBy: req.user.id });
exports.sendToVendor = (req, res) => updateStatus(req, res, 'Sent');
exports.markDelivered = (req, res) => updateStatus(req, res, 'Delivered');
exports.closePO = (req, res) => updateStatus(req, res, 'Closed');
exports.cancelPO = (req, res) => updateStatus(req, res, 'Cancelled');

// Delete PO
exports.deletePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id }
        });
        if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

        const isAdmin = req.user.role === 'COMPANY_OWNER' || req.user.role === 'PM';
        const isOwner = po.createdBy === req.user.id;

        if (!isAdmin && (!isOwner || po.status !== 'Draft')) {
            return res.status(403).json({ message: 'Not authorized to delete this Purchase Order' });
        }

        const poData = { _id: po.id, id: po.id, companyId: po.companyId, projectId: po.projectId, jobId: po.jobId };
        await prisma.purchaseOrder.delete({
            where: { id: req.params.id }
        });

        emitSocketEvent(req, 'po_deleted', poData);
        emitSocketEvent(req, 'purchase_order_update', { action: 'deleted', po: poData });

        res.json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
