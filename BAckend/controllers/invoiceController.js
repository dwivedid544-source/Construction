const prisma = require('../config/prisma');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
    try {
        const where = { companyId: req.user.companyId };

        if (req.user.role === 'CLIENT') {
            where.clientId = req.user._id || req.user.id;
        }

        if (req.query.projectId) where.projectId = req.query.projectId;
        if (req.query.status) where.status = req.query.status;

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(invoices.map(inv => ({
            ...inv,
            _id: inv.id,
            projectId: inv.project ? { _id: inv.project.id, name: inv.project.name } : null,
            clientId: inv.client ? { _id: inv.client.id, fullName: inv.client.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private (PM, Owners)
const createInvoice = async (req, res, next) => {
    try {
        const { invoiceNumber, projectId, clientId, amount, tax, total, status, dueDate } = req.body;
        let finalInvoiceNumber = invoiceNumber;

        if (!finalInvoiceNumber) {
            const count = await prisma.invoice.count({ where: { companyId: req.user.companyId } });
            finalInvoiceNumber = `INV-${String(count + 1).padStart(3, '0')}`;
        }

        const amt = amount ? parseFloat(amount) : 0;
        const tx = tax ? parseFloat(tax) : 0;
        const tot = total ? parseFloat(total) : (amt + tx);

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber: finalInvoiceNumber,
                companyId: req.user.companyId,
                projectId,
                clientId: clientId || null,
                amount: amt,
                tax: tx,
                total: tot,
                status: status || 'DRAFT',
                dueDate: dueDate ? new Date(dueDate) : null
            },
            include: {
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({
            ...invoice,
            _id: invoice.id,
            projectId: invoice.project ? { _id: invoice.project.id, name: invoice.project.name } : null,
            clientId: invoice.client ? { _id: invoice.client.id, fullName: invoice.client.name } : null
        });
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

        const { amount, tax, total, status, dueDate, clientId } = req.body;
        const updateData = {};
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (tax !== undefined) updateData.tax = parseFloat(tax);
        if (total !== undefined) updateData.total = parseFloat(total);
        if (status !== undefined) updateData.status = status;
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (clientId !== undefined) updateData.clientId = clientId;

        const updatedInvoice = await prisma.invoice.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });

        res.json({
            ...updatedInvoice,
            _id: updatedInvoice.id,
            projectId: updatedInvoice.project ? { _id: updatedInvoice.project.id, name: updatedInvoice.project.name } : null,
            clientId: updatedInvoice.client ? { _id: updatedInvoice.client.id, fullName: updatedInvoice.client.name } : null
        });
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
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        res.json({
            ...invoice,
            _id: invoice.id,
            projectId: invoice.project ? { _id: invoice.project.id, name: invoice.project.name } : null,
            clientId: invoice.client ? { _id: invoice.client.id, fullName: invoice.client.name } : null
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

        await prisma.invoice.delete({ where: { id: req.params.id } });
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
