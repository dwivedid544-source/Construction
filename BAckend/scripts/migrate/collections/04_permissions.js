/**
 * 04_permissions.js — Migrate Permissions collection from MongoDB → PostgreSQL.
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

module.exports = async function migratePermissions() {
  const Permission = mongoose.model('Permission', new mongoose.Schema({}, { strict: false }), 'permissions');
  const docs = await Permission.find().lean();

  log.info(`[permissions] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id = toUuid(doc._id);
    const name = cleanStr(doc.name) || cleanStr(doc.key) || `perm_${id.slice(0, 8)}`;
    try {
      await prisma.permission.upsert({
        where  : { id },
        create : {
          id,
          name      : name,
          module    : cleanStr(doc.module) || 'general',
          action    : cleanStr(doc.action) || 'read',
          createdAt : toDate(doc.createdAt) || new Date(),
          updatedAt : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
    } catch (err) {
      errors++;
      log.error(`[permissions] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[permissions] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'permissions', inserted, errors };
};
