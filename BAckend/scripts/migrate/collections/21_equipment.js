'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
module.exports = async function migrateEquipment() {
  const M = mongoose.model('Equipment_m', new mongoose.Schema({}, { strict: false }), 'equipments');
  const docs = await M.find().lean(); log.info(`[equipment] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.equipment.upsert({ where: { id }, create: { id, companyId, projectId: toUuid(d.projectId), name: cleanStr(d.name) || 'Equipment', serialNumber: cleanStr(d.serialNumber), category: cleanStr(d.category), status: cleanStr(d.status) || 'AVAILABLE', dailyRate: parseFloat(d.dailyRate) || 0, createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[equipment] ${id}: ${e.message}`); }
  }
  log.info(`[equipment] ins:${ins} err:${err}`); return { collection: 'equipment', inserted: ins, errors: err };
};
