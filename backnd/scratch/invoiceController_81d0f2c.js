const Invoice = require('../models/Invoice');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
    try {
        const query = { companyId: req.user.companyId };

        // Clients can only see their own invoices
        if (req.user.role === 'CLIENT') {
            query.clientId = req.user._id;
        }

        if (req.query.projectId) query.projectId = req.query.projectId;
        if (req.query.status) query.status = req.query.status;

        const invoices = await Invoice.find(query)
            .populate('companyId')
            .populate({
                path: 'projectId',
                select: 'name location address companyId',
                populate: { path: 'companyId', select: 'name email phone address invoiceSettings logo' }
            })
            .populate('clientId', 'fullName email address')
            .populate('estimateId', 'estimateNumber')
            .populate({
                path: 'poId',
                select: 'poNumber vendorName vendorEmail totalAmount subtotal tax items',
                populate: { path: 'vendorId', select: 'name email phone address' }
            })
            .populate('createdBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private (PM, Owners)
const createInvoice = async (req, res, next) => {
    try {
        const { invoiceNumber, items, totalAmount, subtotal, tax, taxRate, ...rest } = req.body;
        let finalInvoiceNumber = invoiceNumber;

        if (!finalInvoiceNumber) {
            const count = await Invoice.countDocuments({ companyId: req.user.companyId });
            finalInvoiceNumber = `INV-${String(count + 1).padStart(3, '0')}`;
        }

        let parsedItems = [];
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                parsedItems = [];
            }
        } else if (Array.isArray(items)) {
            parsedItems = items;
        }

        let computedSubtotal = Number(subtotal);
        if (isNaN(computedSubtotal) || computedSubtotal === 0) {
            computedSubtotal = parsedItems.reduce((acc, it) => acc + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
        }

        let computedTax = Number(tax) || 0;
        let computedTotal = Number(totalAmount) || (computedSubtotal + computedTax);

        let invoiceImage = '';
        if (req.file) {
            const path = require('path');
            if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
                invoiceImage = req.file.path;
            } else if (req.file.filename) {
                invoiceImage = `/uploads/${req.file.filename}`;
            } else if (req.file.path) {
                invoiceImage = `/uploads/${path.basename(req.file.path)}`;
            }
        }

        const invoice = await Invoice.create({
            ...rest,
            invoiceNumber: finalInvoiceNumber,
            invoiceImage,
            subtotal: computedSubtotal,
            tax: computedTax,
            taxRate: Number(taxRate) || 0,
            totalAmount: computedTotal,
            companyId: req.user.companyId,
            createdBy: req.user._id,
            items: parsedItems
        });
        res.status(201).json(invoice);
    } catch (error) {
        next(error);
    }
};

// @desc    Update invoice status/payment
// @route   PATCH /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        const updatePayload = { ...req.body };
        if (typeof updatePayload.items === 'string') {
            try {
                updatePayload.items = JSON.parse(updatePayload.items);
            } catch (e) {}
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, updatePayload, {
            new: true,
            runValidators: true
        });

        res.json(updatedInvoice);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId })
            .populate('companyId')
            .populate({
                path: 'projectId',
                select: 'name location address companyId',
                populate: { path: 'companyId', select: 'name email phone address invoiceSettings logo' }
            })
            .populate('clientId', 'fullName email address')
            .populate('estimateId', 'estimateNumber')
            .populate({
                path: 'poId',
                select: 'poNumber vendorName vendorEmail totalAmount subtotal tax items',
                populate: { path: 'vendorId', select: 'name email phone address' }
            })
            .populate('createdBy', 'fullName');

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        res.json(invoice);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Owner, PM)
const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        await Invoice.findByIdAndDelete(req.params.id);
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
