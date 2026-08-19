const prisma = require('../config/prisma');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
    try {
        const query = { companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            query.clientId = req.user.id;
        }

        if (req.query.projectId) query.projectId = req.query.projectId;
        if (req.query.status) query.status = req.query.status;

        const invoices = await prisma.invoice.findMany({
            where: query,
            include: {
                project: { select: { name: true } },
                client: { select: { fullName: true } },
                estimate: { select: { id: true, clientName: true } }, // clientName contains number/metadata in some mappings
                creator: { select: { fullName: true } }
            }
        });

        const mapped = invoices.map(inv => ({
            ...inv,
            _id: inv.id,
            projectId: inv.project,
            clientId: inv.client,
            estimateId: inv.estimate ? { _id: inv.estimateId, estimateNumber: `EST-${inv.estimateId.substring(0,6)}` } : null,
            createdBy: inv.creator
        }));

        res.json(mapped);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private (PM, Owners)
const createInvoice = async (req, res, next) => {
    try {
        const { invoiceNumber, ...rest } = req.body;
        let finalInvoiceNumber = invoiceNumber;

        if (!finalInvoiceNumber) {
            const count = await prisma.invoice.count({
                where: { companyId: req.user.companyId }
            });
            finalInvoiceNumber = `INV-${String(count + 1).padStart(3, '0')}`;
        }

        let invoiceImage = '';
        if (req.file) {
            invoiceImage = req.file.path;
        }

        const invoice = await prisma.invoice.create({
            data: {
                companyId: req.user.companyId,
                projectId: rest.projectId,
                clientId: rest.clientId,
                estimateId: rest.estimateId || null,
                invoiceNumber: finalInvoiceNumber,
                invoiceImage,
                totalAmount: rest.totalAmount ? Number(rest.totalAmount) : 0,
                status: rest.status || 'unpaid',
                dueDate: rest.dueDate ? new Date(rest.dueDate) : new Date(),
                items: typeof rest.items === 'string' ? JSON.parse(rest.items) : (rest.items || []),
                createdBy: req.user.id
            }
        });
        res.status(201).json({ ...invoice, _id: invoice.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update invoice status/payment
// @route   PATCH /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        if (data.totalAmount) data.totalAmount = Number(data.totalAmount);
        if (data.dueDate) data.dueDate = new Date(data.dueDate);
        if (data.paidAt) data.paidAt = new Date(data.paidAt);
        if (data.items) {
            data.items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: req.params.id },
            data
        });

        res.json({ ...updatedInvoice, _id: updatedInvoice.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId },
            include: {
                project: { select: { name: true } },
                client: { select: { fullName: true } },
                estimate: { select: { id: true } },
                creator: { select: { fullName: true } }
            }
        });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        res.json({
            ...invoice,
            _id: invoice.id,
            projectId: invoice.project,
            clientId: invoice.client,
            estimateId: invoice.estimate ? { _id: invoice.estimateId, estimateNumber: `EST-${invoice.estimateId.substring(0,6)}` } : null,
            createdBy: invoice.creator
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Owner, PM)
const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        await prisma.invoice.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Invoice removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice
};
