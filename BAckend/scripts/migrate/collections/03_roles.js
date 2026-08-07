/**
 * 03_roles.js — Migrate Roles collection from MongoDB → PostgreSQL.
 * Dependency order: 3 (no FK dependencies)
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

module.exports = async function migrateRoles() {
  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }), 'roles');
  const docs  = await Role.find().lean();

  log.info(`[roles] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id = toUuid(doc._id);
    try {
      await prisma.role.upsert({
        where  : { id },
        create : {
          id,
          name        : cleanStr(doc.name) || 'Unknown Role',
          description : cleanStr(doc.description),
          createdAt   : toDate(doc.createdAt) || new Date(),
          updatedAt   : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
      log.ok(`[roles] upserted: ${id} (${doc.name})`);
    } catch (err) {
      errors++;
      log.error(`[roles] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[roles] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'roles', inserted, errors };
};
