/**
 * invoiceController.js — Invoice Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const invoiceService = require('../services/invoiceService');

// GET /api/invoices
const getInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.getInvoices(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// GET /api/invoices/:id
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
  res.json({
    success: true,
    data: invoice,
  });
});

// POST /api/invoices
const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body, req.user);
  res.status(201).json({
    success: true,
    data: invoice,
  });
});

// PATCH /api/invoices/:id
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: invoice,
  });
});

// DELETE /api/invoices/:id
const deleteInvoice = asyncHandler(async (req, res) => {
  await invoiceService.deleteInvoice(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Invoice deleted successfully',
  });
});

module.exports = {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};
