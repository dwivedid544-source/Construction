'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateTimeLogs() {
  const M = mongoose.model('TimeLog_m', new mongoose.Schema({}, { strict: false }), 'timelogs');
  const docs = await M.find().lean(); log.info(`[timeLogs] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.timeLog.upsert({ where: { id }, create: { id, userId: toUuid(d.userId) || FB, companyId, projectId: toUuid(d.projectId), taskId: toUuid(d.taskId), clockIn: toDate(d.clockIn || d.startTime) || new Date(), clockOut: toDate(d.clockOut || d.endTime), hoursWorked: parseFloat(d.hoursWorked || d.hours) || 0, notes: cleanStr(d.notes), createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[timeLogs] ${id}: ${e.message}`); }
  }
  log.info(`[timeLogs] ins:${ins} err:${err}`); return { collection: 'timeLogs', inserted: ins, errors: err };
};
