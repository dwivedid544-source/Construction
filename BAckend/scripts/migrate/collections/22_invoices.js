'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr, toJson } = require('../helpers');
module.exports = async function migrateInvoices() {
  const M = mongoose.model('Invoice_m', new mongoose.Schema({}, { strict: false }), 'invoices');
  const docs = await M.find().lean(); log.info(`[invoices] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      const invNum = cleanStr(d.invoiceNumber) || `INV-${id.slice(0, 8)}`;
      await prisma.invoice.upsert({ where: { id }, create: { id, invoiceNumber: invNum, companyId, projectId: toUuid(d.projectId), clientId: toUuid(d.clientId), amount: parseFloat(d.amount || d.total) || 0, dueDate: toDate(d.dueDate) || new Date(), status: cleanStr(d.status) || 'PENDING', items: toJson(d.items) || [], createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[invoices] ${id}: ${e.message}`); }
  }
  log.info(`[invoices] ins:${ins} err:${err}`); return { collection: 'invoices', inserted: ins, errors: err };
};
