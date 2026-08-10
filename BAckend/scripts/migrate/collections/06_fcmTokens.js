/**
 * 06_fcmTokens.js — Migrate FCM tokens from MongoDB → PostgreSQL.
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

module.exports = async function migrateFcmTokens() {
  const FcmToken = mongoose.model('FcmToken', new mongoose.Schema({}, { strict: false }), 'fcmtokens');
  const docs = await FcmToken.find().lean();

  log.info(`[fcmTokens] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id     = toUuid(doc._id);
    const userId = toUuid(doc.userId);
    if (!userId) { log.skip(`[fcmTokens] Skipping ${id} — no userId`); continue; }

    try {
      await prisma.fcmToken.upsert({
        where  : { token: cleanStr(doc.token) || id },
        create : {
          id,
          userId,
          token    : cleanStr(doc.token) || id,
          device   : cleanStr(doc.device),
          createdAt: toDate(doc.createdAt) || new Date(),
        },
        update : {},
      });
      inserted++;
    } catch (err) {
      errors++;
      log.error(`[fcmTokens] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[fcmTokens] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'fcmTokens', inserted, errors };
};
