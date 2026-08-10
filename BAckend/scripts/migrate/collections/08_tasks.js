/**
 * 08_tasks.js — Migrate Tasks collection from MongoDB → PostgreSQL.
 */
'use strict';

const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, toFloat, cleanStr } = require('../helpers');

module.exports = async function migrateTasks() {
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
  const docs  = await Task.find().lean();

  log.info(`[tasks] Found ${docs.length} documents`);
  let inserted = 0, errors = 0;

  for (const doc of docs) {
    const id        = toUuid(doc._id);
    const projectId = toUuid(doc.projectId);
    const companyId = toUuid(doc.companyId);
    if (!projectId || !companyId) { log.skip(`[tasks] Skipping ${id} — missing FK`); continue; }

    try {
      await prisma.task.upsert({
        where  : { id },
        create : {
          id,
          title          : cleanStr(doc.title) || 'Untitled Task',
          description    : cleanStr(doc.description),
          projectId,
          companyId,
          assignedToId   : toUuid(doc.assignedTo || doc.assignedToId),
          createdById    : toUuid(doc.createdBy  || doc.createdById),
          status         : cleanStr(doc.status)   || 'PENDING',
          priority       : cleanStr(doc.priority) || 'MEDIUM',
          startDate      : toDate(doc.startDate),
          dueDate        : toDate(doc.dueDate),
          estimatedHours : toFloat(doc.estimatedHours, 0),
          actualHours    : toFloat(doc.actualHours, 0),
          createdAt      : toDate(doc.createdAt) || new Date(),
          updatedAt      : toDate(doc.updatedAt) || new Date(),
        },
        update : {},
      });
      inserted++;
    } catch (err) {
      errors++;
      log.error(`[tasks] FAILED id=${id}: ${err.message}`);
    }
  }

  log.info(`[tasks] Done — inserted: ${inserted}, errors: ${errors}`);
  return { collection: 'tasks', inserted, errors };
};
