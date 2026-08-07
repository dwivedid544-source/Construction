'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr, toStringArray } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migratePhotos() {
  const M = mongoose.model('Photo_m', new mongoose.Schema({}, { strict: false }), 'photos');
  const docs = await M.find().lean(); log.info(`[photos] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const projectId = toUuid(d.projectId); if (!projectId) continue;
    const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.photo.upsert({ where: { id }, create: { id, projectId, companyId, uploadedById: toUuid(d.uploadedById || d.userId) || FB, url: cleanStr(d.url) || 'https://placeholder.local', caption: cleanStr(d.caption), category: cleanStr(d.category), tags: toStringArray(d.tags), createdAt: toDate(d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[photos] ${id}: ${e.message}`); }
  }
  log.info(`[photos] ins:${ins} err:${err}`); return { collection: 'photos', inserted: ins, errors: err };
};
