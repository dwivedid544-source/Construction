/**
 * prisma.js — Mongoose Adapter (Prisma-compatible API)
 *
 * When DB_DRIVER=mongoose (or no real DB is configured), this module provides a
 * prisma-compatible interface backed by Mongoose models. Controllers that call
 * prisma.user.findMany({ where: {...} }) etc. will work transparently.
 *
 * If DB_DRIVER=prisma and DATABASE_URL is a real PostgreSQL URL, the real
 * PrismaClient is returned instead.
 */

const { PrismaClient } = require('@prisma/client');

// ─── Model registry ──────────────────────────────────────────────────────────
// Maps Prisma model names (lowercase) → Mongoose model require paths
const MODEL_MAP = {
  company:           '../models/Company',
  user:              '../models/User',
  plan:              '../models/Plan',
  role:              '../models/Role',
  permission:        '../models/Permission',
  rolepermission:    '../models/RolePermission',
  userpermission:    '../models/UserPermission',
  project:           '../models/Project',
  task:              '../models/Task',
  subtask:           '../models/SubTask',
  tasktemplate:      '../models/TaskTemplate',
  dailylog:          '../models/DailyLog',
  photo:             '../models/Photo',
  rfi:               '../models/RFI',
  tradebid:          '../models/TradeBid',
  purchaseorder:     '../models/purchaseOrder.model',
  vendor:            '../models/Vendor',
  equipment:         '../models/Equipment',
  invoice:           '../models/Invoice',
  estimate:          '../models/Estimate',
  payroll:           '../models/Payroll',
  timelog:           '../models/TimeLog',
  transaction:       '../models/Transaction',
  job:               '../models/Job',
  jobtask:           '../models/JobTask',
  jobworker:         '../models/JobWorker',
  jobtimelog:        '../models/JobTimeLog',
  jobactivitylog:    '../models/JobActivityLog',
  jobnote:           '../models/JobNote',
  chatroom:          '../models/ChatRoom',
  chat:              '../models/Chat',
  chatparticipant:   '../models/ChatParticipant',
  supportticket:     '../models/SupportTicket',
  auditlog:          '../models/AuditLog',
  schedule:          '../models/Schedule',
  notification:      '../models/Notification',
  todo:              '../models/Todo',
  drawing:           '../models/Drawing',
  drawingannotation: '../models/DrawingAnnotation',
  projectdocument:   '../models/ProjectDocument',
  projectnote:       '../models/ProjectNote',
  projectupdate:     '../models/ProjectUpdate',
  issue:             '../models/Issue',
  fcmtoken:          '../models/FcmToken',
  correctionrequest: '../models/CorrectionRequest',
};

// ─── WHERE clause → Mongoose filter conversion ───────────────────────────────
function convertWhere(where) {
  if (!where) return {};
  const filter = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND') { filter['$and'] = value.map(convertWhere); continue; }
    if (key === 'OR')  { filter['$or']  = value.map(convertWhere); continue; }
    if (key === 'NOT') {
      filter['$nor'] = Array.isArray(value) ? value.map(convertWhere) : [convertWhere(value)];
      continue;
    }
    if (value === null || value === undefined) { filter[key] = value; continue; }
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.equals !== undefined) {
        filter[key] = value.mode === 'insensitive'
          ? new RegExp('^' + String(value.equals) + '$', 'i')
          : value.equals;
        continue;
      }
      const converted = {};
      if (value.not !== undefined)        converted['$ne']    = value.not;
      if (value.in !== undefined)         converted['$in']    = value.in;
      if (value.notIn !== undefined)      converted['$nin']   = value.notIn;
      if (value.lt !== undefined)         converted['$lt']    = value.lt;
      if (value.lte !== undefined)        converted['$lte']   = value.lte;
      if (value.gt !== undefined)         converted['$gt']    = value.gt;
      if (value.gte !== undefined)        converted['$gte']   = value.gte;
      const flags = value.mode === 'insensitive' ? 'i' : '';
      if (value.contains !== undefined)   converted['$regex'] = new RegExp(value.contains, flags);
      if (value.startsWith !== undefined) converted['$regex'] = new RegExp('^' + value.startsWith, flags);
      if (value.endsWith !== undefined)   converted['$regex'] = new RegExp(value.endsWith + '$', flags);
      filter[key] = Object.keys(converted).length ? converted : value;
    } else {
      filter[key] = value;
    }
  }
  return filter;
}

// ─── SELECT clause → Mongoose projection ─────────────────────────────────────
function convertSelect(select) {
  if (!select) return null;
  const proj = {};
  for (const [key, val] of Object.entries(select)) {
    if (typeof val === 'boolean') proj[key] = val ? 1 : 0;
  }
  return proj;
}

// ─── ORDER BY → Mongoose sort ─────────────────────────────────────────────────
function convertOrderBy(orderBy) {
  if (!orderBy) return {};
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sort = {};
  for (const item of arr) {
    for (const [key, dir] of Object.entries(item)) {
      sort[key] = dir === 'desc' ? -1 : 1;
    }
  }
  return sort;
}

// ─── Normalise document: _id → id ─────────────────────────────────────────────
function normDoc(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  if (obj._id && !obj.id) obj.id = String(obj._id);
  return obj;
}

// ─── Clean data: handle Prisma relation connect syntax ────────────────────────
function cleanData(data) {
  if (!data) return {};
  const cleaned = {};
  const inc = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && v.connect) {
      cleaned[k + 'Id'] = v.connect.id;
    } else if (v && typeof v === 'object' && v.set) {
      cleaned[k] = v.set;
    } else if (v && typeof v === 'object' && v.increment !== undefined) {
      inc[k] = v.increment;
    } else {
      cleaned[k] = v;
    }
  }
  return { cleaned, inc };
}

// ─── Build a model adapter ───────────────────────────────────────────────────
function buildModelAdapter(Model) {
  return {
    async findMany({ where, select, orderBy, take, skip } = {}) {
      const filter = convertWhere(where);
      const projection = convertSelect(select);
      let q = projection ? Model.find(filter, projection) : Model.find(filter);
      const sort = convertOrderBy(orderBy);
      if (Object.keys(sort).length) q = q.sort(sort);
      if (typeof skip === 'number') q = q.skip(skip);
      if (typeof take === 'number') q = q.limit(take);
      const docs = await q.lean();
      return docs.map(d => ({ ...d, id: d._id ? String(d._id) : d.id }));
    },

    async findUnique({ where, select } = {}) {
      const filter = {};
      if (where.id) filter._id = where.id;
      else Object.assign(filter, convertWhere(where));
      const projection = convertSelect(select);
      const doc = await (projection ? Model.findOne(filter, projection) : Model.findOne(filter));
      return normDoc(doc);
    },

    async findFirst({ where, select, orderBy } = {}) {
      const filter = convertWhere(where);
      const projection = convertSelect(select);
      const sort = convertOrderBy(orderBy);
      let q = projection ? Model.findOne(filter, projection) : Model.findOne(filter);
      if (Object.keys(sort).length) q = q.sort(sort);
      return normDoc(await q);
    },

    async create({ data } = {}) {
      const { cleaned } = cleanData(data);
      const doc = await Model.create(cleaned);
      return normDoc(doc);
    },

    async update({ where, data } = {}) {
      const filter = {};
      if (where.id) filter._id = where.id;
      else Object.assign(filter, convertWhere(where));
      const { cleaned, inc } = cleanData(data);
      const ops = { $set: cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      const doc = await Model.findOneAndUpdate(filter, ops, { new: true });
      return normDoc(doc);
    },

    async updateMany({ where, data } = {}) {
      const filter = convertWhere(where);
      const { cleaned, inc } = cleanData(data);
      const ops = { $set: cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      const result = await Model.updateMany(filter, ops);
      return { count: result.modifiedCount || 0 };
    },

    async delete({ where } = {}) {
      const filter = {};
      if (where.id) filter._id = where.id;
      else Object.assign(filter, convertWhere(where));
      return normDoc(await Model.findOneAndDelete(filter));
    },

    async deleteMany({ where } = {}) {
      const filter = convertWhere(where);
      const result = await Model.deleteMany(filter);
      return { count: result.deletedCount || 0 };
    },

    async count({ where } = {}) {
      return await Model.countDocuments(convertWhere(where));
    },

    async upsert({ where, create: createData, update: updateData } = {}) {
      const filter = {};
      if (where.id) filter._id = where.id;
      else Object.assign(filter, convertWhere(where));
      const { cleaned: uCleaned, inc } = cleanData(updateData);
      const ops = { $set: uCleaned, $setOnInsert: cleanData(createData).cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      const doc = await Model.findOneAndUpdate(filter, ops, { new: true, upsert: true });
      return normDoc(doc);
    },

    async aggregate(args) {
      if (Model.aggregate) return await Model.aggregate(args.pipeline || []);
      return [];
    },
  };
}

// ─── Decide which client to return ───────────────────────────────────────────
const driver = (process.env.DB_DRIVER || 'mongoose').toLowerCase();
const isRealPrismaUrl = !!(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.startsWith('prisma+postgres://localhost')
);

if (driver === 'prisma' && isRealPrismaUrl) {
  // Real Prisma setup — use the actual PrismaClient
  let prismaInstance = null;
  const getPrismaClient = () => {
    if (!prismaInstance) {
      try { prismaInstance = new PrismaClient(); } catch (e) {
        console.warn('[prisma] PrismaClient init error:', e.message);
      }
    }
    return prismaInstance;
  };
  module.exports = new Proxy({}, {
    get(target, prop) {
      const client = getPrismaClient();
      if (!client) throw new Error('PrismaClient is not initialized. Check DATABASE_URL.');
      return client[prop];
    }
  });
} else {
  // Mongoose adapter — lazy model loading, Prisma-compatible API
  console.log('[prisma-mongoose] Using Mongoose adapter (DB_DRIVER=mongoose)');
  const adapters = {};
  module.exports = new Proxy({}, {
    get(target, modelName) {
      if (typeof modelName !== 'string' || modelName.startsWith('_') || modelName === 'then') return undefined;
      const key = modelName.toLowerCase();
      if (adapters[key]) return adapters[key];
      const modelPath = MODEL_MAP[key];
      if (!modelPath) {
        console.warn('[prisma-mongoose] No model mapped for:', modelName);
        return {};
      }
      try {
        const Model = require(modelPath);
        adapters[key] = buildModelAdapter(Model);
        return adapters[key];
      } catch (e) {
        console.warn('[prisma-mongoose] Could not load model', modelPath, ':', e.message);
        return {};
      }
    }
  });
}
