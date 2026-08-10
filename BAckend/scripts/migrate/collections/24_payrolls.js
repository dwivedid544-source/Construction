'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migratePayrolls() {
  const M = mongoose.model('Payroll_m', new mongoose.Schema({}, { strict: false }), 'payrolls');
  const docs = await M.find().lean(); log.info(`[payrolls] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.payroll.upsert({ where: { id }, create: { id, companyId, workerId: toUuid(d.workerId || d.userId) || FB, periodStart: toDate(d.periodStart) || new Date(), periodEnd: toDate(d.periodEnd) || new Date(), totalHours: parseFloat(d.totalHours) || 0, amountPaid: parseFloat(d.amountPaid || d.amount) || 0, status: cleanStr(d.status) || 'PENDING', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[payrolls] ${id}: ${e.message}`); }
  }
  log.info(`[payrolls] ins:${ins} err:${err}`); return { collection: 'payrolls', inserted: ins, errors: err };
};
