/**
 * 01_plans.js — Migrate Plans collection from MongoDB → PostgreSQL.
 * Dependency order: 1 (no foreign keys)
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log    = require('../logger');
const idMap  = require('../idMap');
const { toUuid, toDate, toFloat, toInt, toStringArray, cleanStr } = require('../helpers');

const COLLECTION = 'plans';

module.exports = async function migratePlans() {
  const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');
  const docs  = await Plan.find().lean();

  log.info(`[plans] Found ${docs.length} documents`);
  let inserted = 0, skipped = 0, errors = 0;

  for (const doc of docs) {
    const id = toUuid(doc._id);
    try {
      await prisma.plan.upsert({
        where  : { id },
        create : {
          id,
          name        : cleanStr(doc.name) || 'Unknown Plan',
          price       : toFloat(doc.price, 0),
          period      : cleanStr(doc.period) || 'month',
          maxProjects : toInt(doc.maxProjects, 5),
          maxUsers    : toInt(doc.maxUsers, 10),
          features    : toStringArray(doc.features),
          isPopular   : Boolean(doc.isPopular),
          createdAt   : toDate(doc.createdAt) || new Date(),
          updatedAt   : toDate(doc.updatedAt) || new Date(),
        },
        update : {},   // upsert = skip on conflict
      });
      inserted++;
      log.ok(`[plans] upserted: ${id} (${doc.name})`);
    } catch (err) {
      errors++;
      log.error(`[plans] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[plans] Done — inserted/updated: ${inserted}, skipped: ${skipped}, errors: ${errors}`);
  return { collection: COLLECTION, inserted, skipped, errors };
};
