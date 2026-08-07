/**
 * 02_companies.js — Migrate Companies collection from MongoDB → PostgreSQL.
 * Dependency order: 2 (depends on plans)
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log    = require('../logger');
const { toUuid, toDate, toInt, cleanStr } = require('../helpers');

const COLLECTION = 'companies';

module.exports = async function migrateCompanies() {
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }), 'companies');
  const docs    = await Company.find().lean();

  log.info(`[companies] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id = toUuid(doc._id);
    try {
      await prisma.company.upsert({
        where  : { id },
        create : {
          id,
          name               : cleanStr(doc.name) || 'Unknown Company',
          email              : cleanStr(doc.email),
          phone              : cleanStr(doc.phone),
          address            : cleanStr(doc.address),
          subscriptionPlanId : toUuid(doc.subscriptionPlanId),
          subscriptionStatus : cleanStr(doc.subscriptionStatus) || 'active',
          maxProjects        : toInt(doc.maxProjects, 5),
          maxUsers           : toInt(doc.maxUsers, 10),
          createdAt          : toDate(doc.createdAt) || new Date(),
          updatedAt          : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
      log.ok(`[companies] upserted: ${id} (${doc.name})`);
    } catch (err) {
      errors++;
      log.error(`[companies] FAILED id=${id} name=${doc.name}: ${err.message}`);
    }
  }

  log.info(`[companies] Done — inserted/updated: ${inserted}, errors: ${errors}`);
  return { collection: COLLECTION, inserted, errors };
};
