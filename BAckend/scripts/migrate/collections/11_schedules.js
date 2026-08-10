/**
 * 11_schedules.js — Schedules migrator
 */
'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

module.exports = async function migrateSchedules() {
  const M = mongoose.model('Schedule_m', new mongoose.Schema({}, { strict: false }), 'schedules');
  const docs = await M.find().lean();
  log.info(`[schedules] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id);
    const projectId = toUuid(d.projectId); if (!projectId) { log.skip(`[schedules] skip ${id}`); continue; }
    const companyId = toUuid(d.companyId); if (!companyId) { log.skip(`[schedules] skip ${id}`); continue; }
    try {
      await prisma.schedule.upsert({ where: { id }, create: { id, title: cleanStr(d.title) || 'Schedule', projectId, companyId, startDate: toDate(d.startDate) || new Date(), endDate: toDate(d.endDate) || new Date(), status: cleanStr(d.status) || 'PLANNED', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[schedules] FAILED ${id}: ${e.message}`); }
  }
  log.info(`[schedules] Done — ins:${ins} err:${err}`);
  return { collection: 'schedules', inserted: ins, errors: err };
};
