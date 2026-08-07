'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
module.exports = async function migrateEstimates() {
  const M = mongoose.model('Estimate_m', new mongoose.Schema({}, { strict: false }), 'estimates');
  const docs = await M.find().lean(); log.info(`[estimates] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.estimate.upsert({ where: { id }, create: { id, estimateNumber: cleanStr(d.estimateNumber) || id.slice(0, 8), companyId, projectId: toUuid(d.projectId), amount: parseFloat(d.amount || d.total) || 0, status: cleanStr(d.status) || 'DRAFT', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[estimates] ${id}: ${e.message}`); }
  }
  log.info(`[estimates] ins:${ins} err:${err}`); return { collection: 'estimates', inserted: ins, errors: err };
};
