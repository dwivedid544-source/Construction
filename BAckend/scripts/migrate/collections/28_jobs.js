'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateJobs() {
  const M = mongoose.model('Job_m', new mongoose.Schema({}, { strict: false }), 'jobs');
  const docs = await M.find().lean(); log.info(`[jobs] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.job.upsert({ where: { id }, create: { id, companyId, projectId: toUuid(d.projectId), createdById: toUuid(d.createdById || d.userId) || FB, title: cleanStr(d.title) || 'Job', clientName: cleanStr(d.clientName), status: cleanStr(d.status) || 'IN_PROGRESS', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[jobs] ${id}: ${e.message}`); }
  }
  log.info(`[jobs] ins:${ins} err:${err}`); return { collection: 'jobs', inserted: ins, errors: err };
};
