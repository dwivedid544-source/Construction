'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateIssues() {
  const M = mongoose.model('Issue_m', new mongoose.Schema({}, { strict: false }), 'issues');
  const docs = await M.find().lean(); log.info(`[issues] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    try {
      await prisma.issue.upsert({ where: { id }, create: { id, projectId, reportedById: toUuid(d.reportedById || d.userId) || FB, assignedToId: toUuid(d.assignedToId), title: cleanStr(d.title) || 'Issue', description: cleanStr(d.description), severity: cleanStr(d.severity) || 'MEDIUM', status: cleanStr(d.status) || 'OPEN', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[issues] ${id}: ${e.message}`); }
  }
  log.info(`[issues] ins:${ins} err:${err}`); return { collection: 'issues', inserted: ins, errors: err };
};
