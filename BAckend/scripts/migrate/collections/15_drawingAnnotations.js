'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr, toJson } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateDrawingAnnotations() {
  const M = mongoose.model('DrawingAnnotation_m', new mongoose.Schema({}, { strict: false }), 'drawingannotations');
  const docs = await M.find().lean(); log.info(`[drawingAnnotations] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const drawingId = toUuid(d.drawingId); if (!drawingId) continue;
    try {
      await prisma.drawingAnnotation.upsert({ where: { id }, create: { id, drawingId, authorId: toUuid(d.authorId || d.userId) || FB, type: cleanStr(d.type) || 'note', coords: toJson(d.coords) || {}, text: cleanStr(d.text), createdAt: toDate(d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[drawingAnnotations] ${id}: ${e.message}`); }
  }
  log.info(`[drawingAnnotations] ins:${ins} err:${err}`); return { collection: 'drawingAnnotations', inserted: ins, errors: err };
};
