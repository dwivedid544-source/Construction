/**
 * 07_projects.js — Migrate Projects collection from MongoDB → PostgreSQL.
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, toFloat, cleanStr } = require('../helpers');

module.exports = async function migrateProjects() {
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }), 'projects');
  const docs    = await Project.find().lean();

  log.info(`[projects] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id        = toUuid(doc._id);
    const companyId = toUuid(doc.companyId);
    if (!companyId) { log.skip(`[projects] Skipping ${id} — no companyId`); continue; }

    try {
      await prisma.project.upsert({
        where  : { id },
        create : {
          id,
          name      : cleanStr(doc.name) || 'Unnamed Project',
          code      : cleanStr(doc.code),
          description: cleanStr(doc.description),
          companyId,
          pmId      : toUuid(doc.projectManagerId || doc.pmId),
          clientId  : toUuid(doc.clientId),
          status    : cleanStr(doc.status) || 'ACTIVE',
          startDate : toDate(doc.startDate),
          endDate   : toDate(doc.endDate),
          budget    : toFloat(doc.budget, 0),
          location  : cleanStr(doc.location),
          createdAt : toDate(doc.createdAt) || new Date(),
          updatedAt : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
      log.ok(`[projects] upserted: ${id} (${doc.name})`);
    } catch (err) {
      errors++;
      log.error(`[projects] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[projects] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'projects', inserted, errors };
};
