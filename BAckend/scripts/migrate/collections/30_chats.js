'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr, toJson } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateChats() {
  const M = mongoose.model('Chat_m', new mongoose.Schema({}, { strict: false }), 'chats');
  const docs = await M.find().lean(); log.info(`[chats] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const roomId = toUuid(d.roomId); if (!roomId) continue;
    try {
      await prisma.chat.upsert({ where: { id }, create: { id, roomId, senderId: toUuid(d.senderId || d.userId) || FB, message: cleanStr(d.message) || '', type: cleanStr(d.type) || 'TEXT', attachments: toJson(d.attachments) || [], createdAt: toDate(d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[chats] ${id}: ${e.message}`); }
  }
  log.info(`[chats] ins:${ins} err:${err}`); return { collection: 'chats', inserted: ins, errors: err };
};
