'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateNotifications() {
  const M = mongoose.model('Notification_m', new mongoose.Schema({}, { strict: false }), 'notifications');
  const docs = await M.find().lean(); log.info(`[notifications] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id);
    const recipientId = toUuid(d.recipientId || d.userId) || FB;
    try {
      await prisma.notification.upsert({ where: { id }, create: { id, recipientId, title: cleanStr(d.title) || 'Notification', message: cleanStr(d.message) || 'N/A', type: cleanStr(d.type) || 'INFO', readStatus: Boolean(d.readStatus || d.isRead), link: cleanStr(d.link), createdAt: toDate(d.createdAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[notifications] ${id}: ${e.message}`); }
  }
  log.info(`[notifications] ins:${ins} err:${err}`); return { collection: 'notifications', inserted: ins, errors: err };
};
