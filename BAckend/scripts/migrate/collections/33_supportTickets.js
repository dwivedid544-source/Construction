'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
const FB = '00000000-0000-0000-0000-000000000000';
module.exports = async function migrateSupportTickets() {
  const M = mongoose.model('SupportTicket_m', new mongoose.Schema({}, { strict: false }), 'supporttickets');
  const docs = await M.find().lean(); log.info(`[supportTickets] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      const tnum = cleanStr(d.ticketNumber) || `TKT-${id.slice(0, 8)}`;
      await prisma.supportTicket.upsert({ where: { id }, create: { id, companyId, userId: toUuid(d.userId) || FB, ticketNumber: tnum, subject: cleanStr(d.subject) || 'Support Request', description: cleanStr(d.description), status: cleanStr(d.status) || 'OPEN', priority: cleanStr(d.priority) || 'MEDIUM', createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[supportTickets] ${id}: ${e.message}`); }
  }
  log.info(`[supportTickets] ins:${ins} err:${err}`); return { collection: 'supportTickets', inserted: ins, errors: err };
};
