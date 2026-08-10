'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateTradeBids() {
  const M = mongoose.model('TradeBid_m', new mongoose.Schema({}, { strict: false }), 'tradebids');
  const docs = await M.find().lean(); log.info(`[tradeBids] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.tradeBid.upsert({ where: { id }, create: { id, projectId, companyId, subcontractorId: toUuid(d.subcontractorId || d.userId) || FB, trade: cleanStr(d.trade) || 'General', amount: parseFloat(d.amount || d.bidAmount) || 0, status: cleanStr(d.status) || 'SUBMITTED', proposalUrl: cleanStr(d.proposalUrl), createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[tradeBids] ${id}: ${e.message}`); }
  }
  log.info(`[tradeBids] ins:${ins} err:${err}`); return { collection: 'tradeBids', inserted: ins, errors: err };
};
