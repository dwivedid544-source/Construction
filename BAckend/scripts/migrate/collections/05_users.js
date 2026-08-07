/**
 * 05_users.js — Migrate Users collection from MongoDB → PostgreSQL.
 * Dependency order: 5 (depends on companies, roles)
 * NOTE: fullName in MongoDB maps to name in Prisma schema.
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, toFloat, cleanStr } = require('../helpers');

module.exports = async function migrateUsers() {
  const User = mongoose.model('UserMigrate', new mongoose.Schema({}, { strict: false }), 'users');
  const docs  = await User.find().lean();

  log.info(`[users] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id = toUuid(doc._id);
    try {
      // fullName (Mongoose) → name (Prisma)
      const name = cleanStr(doc.fullName) || cleanStr(doc.name) || 'Unknown User';

      await prisma.user.upsert({
        where  : { id },
        create : {
          id,
          name,
          email       : (cleanStr(doc.email) || `user_${id.slice(0, 8)}@migrated.local`).toLowerCase(),
          password    : cleanStr(doc.password) || '$2b$10$migrated_placeholder_hash',
          phoneNumber : cleanStr(doc.phone) || cleanStr(doc.phoneNumber),
          avatar      : cleanStr(doc.avatar),
          status      : cleanStr(doc.status) || 'ACTIVE',
          isActive    : doc.isActive !== false,
          companyId   : toUuid(doc.companyId),
          roleId      : toUuid(doc.roleId),
          createdAt   : toDate(doc.createdAt) || new Date(),
          updatedAt   : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
      log.ok(`[users] upserted: ${id} (${name})`);
    } catch (err) {
      errors++;
      log.error(`[users] FAILED id=${id} email=${doc.email}: ${err.message}`);
    }
  }

  log.info(`[users] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'users', inserted, errors };
};
