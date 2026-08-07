/**
 * 12_dailyLogs.js — DailyLogs migrator
 */
'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

const FALLBACK_USER = '00000000-0000-0000-0000-000000000000';

module.exports = async function migrateDailyLogs() {
  const M = mongoose.model('DailyLog_m', new mongoose.Schema({}, { strict: false }), 'dailylogs');
  const docs = await M.find().lean();
  log.info(`[dailyLogs] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id);
    const projectId = toUuid(d.projectId); if (!projectId) { log.skip(`[dailyLogs] skip ${id}`); continue; }
    const companyId = toUuid(d.companyId); if (!companyId) { log.skip(`[dailyLogs] skip ${id}`); continue; }
    try {
      await prisma.dailyLog.upsert({ where: { id }, create: { id, projectId, companyId, engineerId: toUuid(d.engineerId || d.userId) || FALLBACK_USER, logDate: toDate(d.logDate) || new Date(), weather: cleanStr(d.weather), notes: cleanStr(d.notes), workerCount: parseInt(d.workerCount, 10) || 0, approved: Boolean(d.approved), createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[dailyLogs] FAILED ${id}: ${e.message}`); }
  }
  log.info(`[dailyLogs] Done — ins:${ins} err:${err}`);
  return { collection: 'dailyLogs', inserted: ins, errors: err };
};
