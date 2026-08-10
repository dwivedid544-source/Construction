/**
 * 09_subTasks.js — SubTasks migrator
 */
'use strict';
const mongoose = require('mongoose');
const { prisma } = require('../config');
const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');

module.exports = async function migrateSubTasks() {
  const M = mongoose.model('SubTask', new mongoose.Schema({}, { strict: false }), 'subtasks');
  const docs = await M.find().lean();
  log.info(`[subTasks] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const taskId = toUuid(d.taskId);
    if (!taskId) { log.skip(`[subTasks] skip ${id}`); continue; }
    try {
      await prisma.subTask.upsert({ where: { id }, create: { id, taskId, title: cleanStr(d.title)||'Subtask', assignedToId: toUuid(d.assignedTo||d.assignedToId), completed: Boolean(d.completed), dueDate: toDate(d.dueDate), createdAt: toDate(d.createdAt)||new Date(), updatedAt: toDate(d.updatedAt)||new Date() }, update: {} });
      ins++;
    } catch(e) { err++; log.error(`[subTasks] FAILED ${id}: ${e.message}`); }
  }
  log.info(`[subTasks] Done — ins:${ins} err:${err}`);
  return { collection:'subTasks', inserted:ins, errors:err };
};
