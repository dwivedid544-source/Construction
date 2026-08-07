'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
module.exports = async function migrateTransactions() {
  const M = mongoose.model('Transaction_m', new mongoose.Schema({}, { strict: false }), 'transactions');
  const docs = await M.find().lean(); log.info(`[transactions] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.transaction.upsert({ where: { id }, create: { id, companyId, amount: parseFloat(d.amount) || 0, type: cleanStr(d.type) || 'OTHER', paymentMethod: cleanStr(d.paymentMethod), stripePaymentIntentId: cleanStr(d.stripePaymentIntentId), status: cleanStr(d.status) || 'COMPLETED', createdAt: toDate(d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[transactions] ${id}: ${e.message}`); }
  }
  log.info(`[transactions] ins:${ins} err:${err}`); return { collection: 'transactions', inserted: ins, errors: err };
};
