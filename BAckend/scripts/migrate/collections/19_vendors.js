'use strict';
const mongoose = require('mongoose'); const { prisma } = require('../config'); const log = require('../logger');
const { toUuid, toDate, cleanStr } = require('../helpers');
module.exports = async function migrateVendors() {
  const M = mongoose.model('Vendor_m', new mongoose.Schema({}, { strict: false }), 'vendors');
  const docs = await M.find().lean(); log.info(`[vendors] Found ${docs.length}`);
  let ins = 0, err = 0;
  for (const d of docs) {
    const id = toUuid(d._id); const companyId = toUuid(d.companyId); if (!companyId) continue;
    try {
      await prisma.vendor.upsert({ where: { id }, create: { id, companyId, name: cleanStr(d.name) || 'Vendor', contactPerson: cleanStr(d.contactPerson), email: cleanStr(d.email), phone: cleanStr(d.phone), trade: cleanStr(d.trade), taxId: cleanStr(d.taxId), createdAt: toDate(d.createdAt) || new Date(), updatedAt: toDate(d.updatedAt) || new Date() }, update: {} });
      ins++;
    } catch (e) { err++; log.error(`[vendors] ${id}: ${e.message}`); }
  }
  log.info(`[vendors] ins:${ins} err:${err}`); return { collection: 'vendors', inserted: ins, errors: err };
};
