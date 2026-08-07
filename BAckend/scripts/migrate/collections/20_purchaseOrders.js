'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr, toJson } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migratePurchaseOrders() {
  const M = mongoose.model('PurchaseOrder_m', new mongoose.Schema({}, { strict: false }), 'purchaseorders');
  const docs = await M.find().lean(); log.info(`[purchaseOrders] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.purchaseOrder.upsert({ where: { id }, create: { id, companyId, poNumber: parseInt(d.poNumber, 10) || 1, vendorId: toUuid(d.vendorId), projectId: toUuid(d.projectId), approvedById: toUuid(d.approvedById || d.userId), totalAmount: parseFloat(d.totalAmount || d.total) || 0, status: cleanStr(d.status) || 'DRAFT', items: toJson(d.items) || [], deliveryDate: toDate(d.deliveryDate), createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[purchaseOrders] ${id}: ${e.message}`); }
  }
  log.info(`[purchaseOrders] ins:${ins} err:${err}`); return { collection: 'purchaseOrders', inserted: ins, errors: err };
};
