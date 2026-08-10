'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateCorrectionRequests() {
  const M = mongoose.model('CorrectionRequest_m', new mongoose.Schema({}, { strict: false }), 'correctionrequests');
  const docs = await M.find().lean(); log.info(`[correctionRequests] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    try {
      await prisma.correctionRequest.upsert({ where: { id }, create: { id, projectId, requestedById: toUuid(d.requestedById || d.userId) || FB, itemType: cleanStr(d.itemType) || 'general', description: cleanStr(d.description) || 'N/A', status: cleanStr(d.status) || 'PENDING', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[correctionRequests] ${id}: ${e.message}`); }
  }
  log.info(`[correctionRequests] ins:${ins} err:${err}`); return { collection: 'correctionRequests', inserted: ins, errors: err };
};
