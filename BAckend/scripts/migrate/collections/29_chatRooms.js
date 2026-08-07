'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateChatRooms() {
  const M = mongoose.model('ChatRoom_m', new mongoose.Schema({}, { strict: false }), 'chatrooms');
  const docs = await M.find().lean(); log.info(`[chatRooms] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.chatRoom.upsert({ where: { id }, create: { id, companyId, name: cleanStr(d.name) || 'Room', type: cleanStr(d.type) || 'GROUP', isActive: d.isActive !== false, createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[chatRooms] ${id}: ${e.message}`); }
  }
  log.info(`[chatRooms] ins:${ins} err:${err}`); return { collection: 'chatRooms', inserted: ins, errors: err };
};
