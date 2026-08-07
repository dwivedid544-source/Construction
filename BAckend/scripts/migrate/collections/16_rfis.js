'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateRfis() {
  const M = mongoose.model('RFI_m', new mongoose.Schema({}, { strict: false }), 'rfis');
  const docs = await M.find().lean(); log.info(`[rfis] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.rFI.upsert({ where: { id }, create: { id, number: parseInt(d.number, 10) || 1, projectId, companyId, createdById: toUuid(d.createdById || d.userId) || FB, assignedToId: toUuid(d.assignedToId), title: cleanStr(d.title) || 'RFI', question: cleanStr(d.question) || 'N/A', answer: cleanStr(d.answer), status: cleanStr(d.status) || 'OPEN', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[rfis] ${id}: ${e.message}`); }
  }
  log.info(`[rfis] ins:${ins} err:${err}`); return { collection: 'rfis', inserted: ins, errors: err };
};
