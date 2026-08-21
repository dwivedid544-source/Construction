/**
 * prisma.js — High-Performance Mongoose Proxy Adapter for MongoDB
 *
 * Implements the Prisma-compatible interface backed 100% natively by Mongoose models.
 * Zero Prisma runtime binary dependencies. All queries execute directly against MongoDB.
 */

const mongoose = require('mongoose');

// Configure Mongoose options for maximum flexibility across relational queries
mongoose.set('strictPopulate', false);

// Maps model names (lowercase) to their Mongoose model file paths
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
  subscriptionorder: '../models/SubscriptionOrder',
};

// ─── WHERE clause → Mongoose filter conversion ───────────────────────────────
function convertWhere(where) {
  if (!where || typeof where !== 'object') return {};
  const filter = {};

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === 'id') {
      if (typeof value === 'object' && value !== null) {
        const sub = {};
        if (value.in) sub.$in = value.in;
        if (value.notIn) sub.$nin = value.notIn;
        if (value.not) sub.$ne = value.not;
        filter._id = Object.keys(sub).length ? sub : value;
      } else {
        filter._id = value;
      }
      continue;
    }

    if (key === '_id') {
      filter._id = value;
      continue;
    }

    if (key === 'AND') {
      const arr = Array.isArray(value) ? value : [value];
      filter.$and = arr.map(convertWhere);
      continue;
    }
    if (key === 'OR') {
      const arr = Array.isArray(value) ? value : [value];
      filter.$or = arr.map(convertWhere);
      continue;
    }
    if (key === 'NOT') {
      const arr = Array.isArray(value) ? value : [value];
      filter.$nor = arr.map(convertWhere);
      continue;
    }

    // Compound unique keys e.g. roleId_permissionId: { roleId, permissionId }
    if (key.includes('_') && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const parts = key.split('_');
      if (parts.every(p => value[p] !== undefined)) {
        Object.assign(filter, value);
        continue;
      }
    }

    let actualKey = key;
    if (key === 'pms') actualKey = 'pmIds';

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId) && !(value instanceof RegExp)) {
      // Prisma relational 'some' filter for MongoDB array of IDs / refs
      if (value.some !== undefined) {
        if (typeof value.some === 'object' && value.some !== null) {
          const targetId = value.some.id || value.some._id || value.some.equals;
          if (targetId) {
            filter[actualKey] = targetId;
          } else if (value.some.in) {
            filter[actualKey] = { $in: value.some.in };
          } else {
            filter[actualKey] = convertWhere(value.some);
          }
        } else {
          filter[actualKey] = value.some;
        }
        continue;
      }

      // Prisma relational 'every' filter
      if (value.every !== undefined) {
        if (Array.isArray(value.every)) {
          filter[actualKey] = { $all: value.every };
        } else if (typeof value.every === 'object' && value.every !== null) {
          const targetId = value.every.id || value.every._id;
          if (targetId) {
            filter[actualKey] = { $all: [targetId] };
          } else {
            filter[actualKey] = convertWhere(value.every);
          }
        }
        continue;
      }

      // Prisma relational 'none' filter
      if (value.none !== undefined) {
        if (typeof value.none === 'object' && value.none !== null) {
          const targetId = value.none.id || value.none._id;
          if (targetId) {
            filter[actualKey] = { $nin: [targetId] };
          }
        }
        continue;
      }

      const converted = {};
      if (value.in !== undefined) converted.$in = value.in;
      if (value.notIn !== undefined) converted.$nin = value.notIn;
      if (value.not !== undefined) converted.$ne = value.not;
      if (value.equals !== undefined) converted.$eq = value.equals;
      if (value.lt !== undefined) converted.$lt = value.lt;
      if (value.lte !== undefined) converted.$lte = value.lte;
      if (value.gt !== undefined) converted.$gt = value.gt;
      if (value.gte !== undefined) converted.$gte = value.gte;

      const flags = value.mode === 'insensitive' ? 'i' : '';
      if (value.contains !== undefined) converted.$regex = new RegExp(escapeRegex(value.contains), flags);
      if (value.startsWith !== undefined) converted.$regex = new RegExp('^' + escapeRegex(value.startsWith), flags);
      if (value.endsWith !== undefined) converted.$regex = new RegExp(escapeRegex(value.endsWith) + '$', flags);

      filter[actualKey] = Object.keys(converted).length ? converted : value;
    } else {
      filter[actualKey] = value;
    }
  }

  return filter;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── SELECT clause → Mongoose projection ─────────────────────────────────────
function convertSelect(select) {
  if (!select || typeof select !== 'object') return null;
  const proj = {};
  for (const [key, val] of Object.entries(select)) {
    const k = key === 'id' ? '_id' : key;
    if (typeof val === 'boolean') {
      proj[k] = val ? 1 : 0;
    }
  }
  return Object.keys(proj).length ? proj : null;
}

// ─── ORDER BY → Mongoose sort ─────────────────────────────────────────────────
function convertOrderBy(orderBy) {
  if (!orderBy) return {};
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sort = {};
  for (const item of arr) {
    for (const [key, dir] of Object.entries(item)) {
      const k = key === 'id' ? '_id' : key;
      sort[k] = (dir === 'desc' || dir === -1) ? -1 : 1;
    }
  }
  return sort;
}

// ─── Normalise document: _id ↔ id & Populate aliases ─────────────────────────
function normDoc(doc) {
  if (!doc) return null;
  if (Array.isArray(doc)) return doc.map(normDoc);
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  if (obj._id && !obj.id) obj.id = String(obj._id);
  if (obj.id && !obj._id) obj._id = obj.id;

  // Relation aliases
  if (obj.subscriptionPlanId && typeof obj.subscriptionPlanId === 'object' && !obj.subscriptionPlan) {
    obj.subscriptionPlan = normDoc(obj.subscriptionPlanId);
  }
  if (obj.companyId && typeof obj.companyId === 'object' && !obj.company) {
    obj.company = normDoc(obj.companyId);
  }
  if (obj.permissionId && typeof obj.permissionId === 'object' && !obj.permission) {
    obj.permission = normDoc(obj.permissionId);
  }
  if (obj.roleId && typeof obj.roleId === 'object' && !obj.role) {
    obj.role = normDoc(obj.roleId);
  }
  if (obj.pmId && typeof obj.pmId === 'object' && !obj.pm) {
    obj.pm = normDoc(obj.pmId);
  }
  if (obj.clientId && typeof obj.clientId === 'object' && !obj.client) {
    obj.client = normDoc(obj.clientId);
  }
  if (obj.createdBy && typeof obj.createdBy === 'object' && !obj.creator) {
    obj.creator = normDoc(obj.createdBy);
  }
  if (obj.projectId && typeof obj.projectId === 'object' && !obj.project) {
    obj.project = normDoc(obj.projectId);
  }
  if (obj.foremanId && typeof obj.foremanId === 'object' && !obj.foreman) {
    obj.foreman = normDoc(obj.foremanId);
  }
  if (obj.jobId && typeof obj.jobId === 'object' && !obj.job) {
    obj.job = normDoc(obj.jobId);
  }
  if (obj.taskId && typeof obj.taskId === 'object' && !obj.task) {
    obj.task = normDoc(obj.taskId);
  }
  if (obj.vendorId && typeof obj.vendorId === 'object' && !obj.vendor) {
    obj.vendor = normDoc(obj.vendorId);
  }
  if (obj.estimateId && typeof obj.estimateId === 'object' && !obj.estimate) {
    obj.estimate = normDoc(obj.estimateId);
  }
  if (obj.poId && typeof obj.poId === 'object' && !obj.purchaseOrder) {
    obj.purchaseOrder = normDoc(obj.poId);
  }

  return obj;
}

// ─── Clean data: handle Prisma relation connect syntax ────────────────────────
function cleanData(data) {
  if (!data || typeof data !== 'object') return { cleaned: {}, inc: {} };
  const cleaned = {};
  const inc = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof mongoose.Types.ObjectId)) {
      if (v.connect) {
        if (Array.isArray(v.connect)) {
          const ids = v.connect.map(c => (c && typeof c === 'object' ? (c.id || c._id) : c)).filter(Boolean);
          cleaned[k + 'Ids'] = ids;
          cleaned[k] = ids;
        } else if (v.connect.id || v.connect._id) {
          const id = v.connect.id || v.connect._id;
          cleaned[k + 'Id'] = id;
          cleaned[k] = id;
        }
      } else if (v.set !== undefined) {
        if (Array.isArray(v.set)) {
          const ids = v.set.map(c => (c && typeof c === 'object' ? (c.id || c._id || c) : c)).filter(Boolean);
          cleaned[k + 'Ids'] = ids;
          cleaned[k] = ids;
        } else {
          cleaned[k] = v.set;
        }
      } else if (v.increment !== undefined) {
        inc[k] = v.increment;
      } else {
        cleaned[k] = v;
      }
    } else {
      cleaned[k] = v;
    }
  }
  return { cleaned, inc };
}

// ─── Apply population based on include options ────────────────────────────────
function applyIncludes(query, include, Model) {
  if (!include || typeof include !== 'object') return query;
  for (const [key, val] of Object.entries(include)) {
    if (val) {
      let populateField = key;
      if (Model && Model.schema && Model.schema.paths) {
        if (!Model.schema.paths[key] && Model.schema.paths[key + 'Id']) {
          populateField = key + 'Id';
        } else if (!Model.schema.paths[key] && key === 'subscriptionPlan') {
          populateField = 'subscriptionPlanId';
        } else if (!Model.schema.paths[key] && key === 'creator') {
          populateField = 'createdBy';
        } else if (!Model.schema.paths[key] && key === 'assignee') {
          populateField = 'assignedTo';
        } else if (!Model.schema.paths[key] && key === 'worker') {
          populateField = 'assignedTo';
        } else if (!Model.schema.paths[key] && key === 'foreman') {
          populateField = 'foremanId';
        }
      }
      try {
        const select = (typeof val === 'object' && val.select) ? convertSelect(val.select) : null;
        if (select) {
          query = query.populate({ path: populateField, select });
        } else {
          query = query.populate(populateField);
        }
      } catch (e) {
        console.warn(`[prisma-mongoose] Populate warning for ${populateField}:`, e.message);
      }
    }
  }
  return query;
}

// ─── Build a model adapter ───────────────────────────────────────────────────
function buildModelAdapter(Model, modelName) {
  return {
    async findMany({ where, select, include, orderBy, take, skip, distinct } = {}) {
      const filter = convertWhere(where);
      const projection = convertSelect(select);
      let q = projection ? Model.find(filter, projection) : Model.find(filter);
      q = applyIncludes(q, include, Model);
      const sort = convertOrderBy(orderBy);
      if (Object.keys(sort).length) q = q.sort(sort);
      if (typeof skip === 'number') q = q.skip(skip);
      if (typeof take === 'number') q = q.limit(take);
      const docs = await q.lean({ virtuals: true });
      return docs.map(d => normDoc(d));
    },

    async findUnique({ where, select, include } = {}) {
      const filter = convertWhere(where);
      const projection = convertSelect(select);
      let q = projection ? Model.findOne(filter, projection) : Model.findOne(filter);
      q = applyIncludes(q, include, Model);
      const doc = await q.lean({ virtuals: true });
      return normDoc(doc);
    },

    async findFirst({ where, select, include, orderBy } = {}) {
      const filter = convertWhere(where);
      const projection = convertSelect(select);
      let q = projection ? Model.findOne(filter, projection) : Model.findOne(filter);
      q = applyIncludes(q, include, Model);
      const sort = convertOrderBy(orderBy);
      if (Object.keys(sort).length) q = q.sort(sort);
      const doc = await q.lean({ virtuals: true });
      return normDoc(doc);
    },

    async create({ data, select, include } = {}) {
      const { cleaned } = cleanData(data);
      const doc = await Model.create(cleaned);
      let result = doc;
      if (include) {
        result = await Model.findById(doc._id).populate(Object.keys(include).filter(k => include[k])).lean({ virtuals: true });
      }
      return normDoc(result);
    },

    async createMany({ data, skipDuplicates } = {}) {
      const items = Array.isArray(data) ? data : [data];
      const cleanedItems = items.map(item => cleanData(item).cleaned);
      if (cleanedItems.length === 0) return { count: 0 };
      try {
        const docs = await Model.insertMany(cleanedItems, { ordered: !skipDuplicates });
        return { count: docs.length };
      } catch (err) {
        if (skipDuplicates && err.insertedDocs) {
          return { count: err.insertedDocs.length };
        }
        throw err;
      }
    },

    async update({ where, data, select, include } = {}) {
      const filter = convertWhere(where);
      const { cleaned, inc } = cleanData(data);
      const ops = { $set: cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      let q = Model.findOneAndUpdate(filter, ops, { new: true });
      q = applyIncludes(q, include, Model);
      const doc = await q.lean({ virtuals: true });
      return normDoc(doc);
    },

    async updateMany({ where, data } = {}) {
      const filter = convertWhere(where);
      const { cleaned, inc } = cleanData(data);
      const ops = { $set: cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      const result = await Model.updateMany(filter, ops);
      return { count: result.modifiedCount || result.matchedCount || 0 };
    },

    async delete({ where } = {}) {
      const filter = convertWhere(where);
      const doc = await Model.findOneAndDelete(filter).lean({ virtuals: true });
      return normDoc(doc);
    },

    async deleteMany({ where } = {}) {
      const filter = convertWhere(where);
      const result = await Model.deleteMany(filter);
      return { count: result.deletedCount || 0 };
    },

    async count({ where } = {}) {
      const filter = convertWhere(where);
      return await Model.countDocuments(filter);
    },

    async upsert({ where, create: createData, update: updateData } = {}) {
      const filter = convertWhere(where);
      const { cleaned: uCleaned, inc } = cleanData(updateData);
      const ops = { $set: uCleaned, $setOnInsert: cleanData(createData).cleaned };
      if (Object.keys(inc).length) ops.$inc = inc;
      const doc = await Model.findOneAndUpdate(filter, ops, { new: true, upsert: true }).lean({ virtuals: true });
      return normDoc(doc);
    },

    async groupBy({ by, _count, where, orderBy, take } = {}) {
      const pipeline = [];
      if (where) pipeline.push({ $match: convertWhere(where) });
      const groupStage = { _id: {} };
      (by || []).forEach(field => {
        groupStage._id[field] = `$${field === 'id' ? '_id' : field}`;
      });
      if (_count) {
        groupStage._count = { $sum: 1 };
      }
      pipeline.push({ $group: groupStage });
      if (orderBy) {
        const sort = {};
        if (orderBy._count && orderBy._count.id) {
          sort._count = orderBy._count.id === 'desc' ? -1 : 1;
        }
        if (Object.keys(sort).length) pipeline.push({ $sort: sort });
      }
      if (typeof take === 'number') pipeline.push({ $limit: take });

      const results = await Model.aggregate(pipeline);
      return results.map(r => {
        const item = { ...r._id };
        if (r._count !== undefined) item._count = { id: r._count };
        return item;
      });
    },

    async aggregate(args) {
      if (Model.aggregate) return await Model.aggregate(args.pipeline || []);
      return [];
    },
  };
}

// ─── Proxy Hub ───────────────────────────────────────────────────────────────
const adapters = {};

const prisma = new Proxy({
  $connect: async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGODB_URI;
      if (uri) await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'construction_saas' });
    }
    return true;
  },
  $disconnect: async () => {
    return true;
  },
  $transaction: async (arg) => {
    if (typeof arg === 'function') {
      return await arg(prisma);
    }
    if (Array.isArray(arg)) {
      return await Promise.all(arg);
    }
    return arg;
  }
}, {
  get(target, modelName) {
    if (typeof modelName !== 'string') return undefined;
    if (modelName in target) return target[modelName];
    if (modelName.startsWith('_') || modelName === 'then' || modelName === 'catch') return undefined;

    const key = modelName.toLowerCase();
    if (adapters[key]) return adapters[key];

    const modelPath = MODEL_MAP[key];
    if (!modelPath) {
      console.warn(`[prisma-mongoose] Warning: No Mongoose model mapped for '${modelName}'`);
      return {};
    }

    try {
      const Model = require(modelPath);
      adapters[key] = buildModelAdapter(Model, modelName);
      return adapters[key];
    } catch (e) {
      console.warn(`[prisma-mongoose] Error loading model ${modelPath}:`, e.message);
      return {};
    }
  }
});

// Preload all Mongoose models so relations and populate() work without MissingSchemaError
for (const [key, modelPath] of Object.entries(MODEL_MAP)) {
  try {
    const Model = require(modelPath);
    if (Model && Model.modelName) {
      adapters[key] = buildModelAdapter(Model, Model.modelName);
    }
  } catch (e) {
    // Model might be loaded later or optional
  }
}

module.exports = prisma;
