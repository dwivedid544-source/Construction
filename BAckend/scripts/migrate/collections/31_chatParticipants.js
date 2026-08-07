'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateChatParticipants() {
  const M = mongoose.model('ChatParticipant_m', new mongoose.Schema({}, { strict: false }), 'chatparticipants');
  const docs = await M.find().lean(); log.info(`[chatParticipants] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const roomId = toUuid(d.roomId); const userId = toUuid(d.userId);
    if (!roomId || !userId) continue;
    try {
      await prisma.chatParticipant.upsert({ where: { roomId_userId: { roomId, userId } }, create: { id, roomId, userId, role: cleanStr(d.role) || 'MEMBER', joinedAt: toDate(d.joinedAt || d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[chatParticipants] ${id}: ${e.message}`); }
  }
  log.info(`[chatParticipants] ins:${ins} err:${err}`); return { collection: 'chatParticipants', inserted: ins, errors: err };
};
