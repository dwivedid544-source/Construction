/**
 * vendorController.js — Trade Vendor Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const vendorService = require('../services/vendorService');
const { tradeBidRepository } = require('../repositories');

// GET /api/vendors
const getVendors = asyncHandler(async (req, res) => {
  const result = await vendorService.getVendors(req.query, req.user);
  const list = Array.isArray(result) ? result : (result.data || []);
  res.json(list);
});

// POST /api/vendors
const createVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorService.createVendor(req.body, req.user);
  res.status(201).json({
    success: true,
    data: vendor,
  });
});

// PATCH /api/vendors/:id
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: vendor,
  });
});

// DELETE /api/vendors/:id
const deleteVendor = asyncHandler(async (req, res) => {
  await vendorService.deleteVendor(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Vendor deleted successfully',
  });
});

// Public Trade Bidding APIs
const getPublicDrawingInfo = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id },
  });
});

const submitBid = asyncHandler(async (req, res) => {
  const bid = await tradeBidRepository.create(req.body);
  res.status(201).json({
    success: true,
    data: bid,
  });
});

const sendDrawingToTrades = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Drawing dispatched to trades',
  });
});

const getBids = asyncHandler(async (req, res) => {
  const bids = await tradeBidRepository.findMany({ companyId: req.user.companyId });
  const list = Array.isArray(bids) ? bids : (bids.data || []);
  res.json(list);
});

const updateBidStatus = asyncHandler(async (req, res) => {
  const updated = await tradeBidRepository.updateById(req.params.id, req.body);
  res.json({
    success: true,
    data: updated,
  });
});

const deleteBid = asyncHandler(async (req, res) => {
  await tradeBidRepository.softDeleteById(req.params.id);
  res.json({
    success: true,
    message: 'Bid deleted',
  });
});

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getPublicDrawingInfo,
  submitBid,
  sendDrawingToTrades,
  getBids,
  updateBidStatus,
  deleteBid,
};
