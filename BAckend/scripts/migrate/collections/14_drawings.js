'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateDrawings() {
  const M = mongoose.model('Drawing_m', new mongoose.Schema({}, { strict: false }), 'drawings');
  const docs = await M.find().lean(); log.info(`[drawings] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    try {
      await prisma.drawing.upsert({ where: { id }, create: { id, projectId, uploadedById: toUuid(d.uploadedById || d.userId) || FB, title: cleanStr(d.title) || 'Drawing', fileUrl: cleanStr(d.fileUrl) || 'https://placeholder.local', version: cleanStr(d.version) || 'v1.0', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[drawings] ${id}: ${e.message}`); }
  }
  log.info(`[drawings] ins:${ins} err:${err}`); return { collection: 'drawings', inserted: ins, errors: err };
};
