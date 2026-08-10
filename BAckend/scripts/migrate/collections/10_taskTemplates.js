/**
 * 10_taskTemplates.js — TaskTemplates migrator
 */
'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr, toJson } = require('../helpers');

module.exports = async function migrateTaskTemplates() {
  const M = mongoose.model('TaskTemplate', new mongoose.Schema({}, { strict: false }), 'tasktemplates');
  const docs = await M.find().lean();
  log.info(`[taskTemplates] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId);
    if (!companyId) { log.skip(`[taskTemplates] skip ${id}`); continue; }
    try {
      await prisma.taskTemplate.upsert({ where: { id }, create: { id, name: cleanStr(d.name)||'Template', category: cleanStr(d.category), companyId, tasks: toJson(d.tasks)||[], createdAt: toDate(d.createdAt)||new Date(), updatedAt: toDate(d.updatedAt)||new Date() }, update: {} });
      ins++;
    } catch(e) { err++; log.error(`[taskTemplates] FAILED ${id}: ${e.message}`); }
  }
  log.info(`[taskTemplates] Done — ins:${ins} err:${err}`);
  return { collection:'taskTemplates', inserted:ins, errors:err };
};
