const prisma = require('../config/prisma');

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

        // Auto-increment PO Number
        const counter = await prisma.counter.upsert({
            where: { model: 'poNumber' },
            update: { count: { increment: 1 } },
            create: { model: 'poNumber', count: 1 }
        });
        const poNumber = `PO-${String(counter.count).padStart(6, '0')}`;

        let status = 'Draft';
        if (req.user.role === 'PM' || req.user.role === 'COMPANY_OWNER') {
            status = 'Pending Approval';
        } else if (req.user.role === 'FOREMAN') {
            status = 'Draft';
        }

        const po = await prisma.purchaseOrder.create({
            data: {
                companyId: req.user.companyId,
                poNumber,
                projectId,
                jobId: cleanJobId,
                vendorId: cleanVendorId,
                vendorName: vendorName || '',
                vendorEmail: vendorEmail || '',
                createdBy: req.user.id,
                items: typeof items === 'string' ? JSON.parse(items) : (items || []),
                notesToVendor: notesToVendor || '',
                internalNotes: internalNotes || '',
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                status,
                subtotal: subtotal ? Number(subtotal) : 0,
                tax: tax ? Number(tax) : 0,
                totalAmount: totalAmount ? Number(totalAmount) : 0
            }
        });

        res.status(201).json({ ...po, _id: po.id });
    } catch (error) {
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
            projectId: po.project,
            vendorId: po.vendor,
            createdBy: po.creator
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
            companyId: po.company,
            projectId: po.project,
            vendorId: po.vendor,
            createdBy: po.creator
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
            data
        });

        res.json({ ...updated, _id: updated.id });
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
            }
        });
        res.json({ ...updated, _id: updated.id });
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

        await prisma.purchaseOrder.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
