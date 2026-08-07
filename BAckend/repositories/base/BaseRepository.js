/**
 * BaseRepository.js — Abstract Prisma repository base class.
 *
 * Provides a standard CRUD + pagination + search + soft-delete + transaction
 * surface that every model-specific repository extends. Repositories need only
 * override the constructor to set `this.model` and optionally `this.softDelete`
 * and `this.searchFields`.
 *
 * Architecture
 * ┌──────────────────────────────┐
 * │  Controller / Service        │
 * │  ↓ calls                     │
 * │  ConcreteRepository          │  (e.g. UserRepository)
 * │  extends BaseRepository      │
 * │  ↓ delegates to              │
 * │  prisma[this.model].*        │  (real PrismaClient or Mongoose adapter)
 * └──────────────────────────────┘
 *
 * Usage:
 *   class UserRepository extends BaseRepository {
 *     constructor() {
 *       super('user', { softDelete: true, searchFields: ['name', 'email'] });
 *     }
 *   }
 */

'use strict';

const prisma        = require('../../config/prisma');
const logger        = require('../../utils/logger');
const AppError      = require('../../utils/AppError');
const { parsePagination, buildMeta }   = require('../../utils/pagination');
const { buildPrismaSearch, mergeWithSearch } = require('../../utils/search');

class BaseRepository {
  /**
   * @param {string} model           Prisma model name in camelCase (e.g. 'user', 'project').
   * @param {object} [options]
   * @param {boolean} [options.softDelete=false]   Whether deletedAt is on this model.
   * @param {string[]} [options.searchFields=[]]   Fields used by search().
   */
  constructor(model, options = {}) {
    if (!model) throw new Error('BaseRepository requires a model name.');
    this.model        = model;
    this.softDelete   = options.softDelete   ?? false;
    this.searchFields = options.searchFields ?? [];
    this.log          = logger.scope(this.constructor.name);
  }

  /** The Prisma model delegate (e.g. prisma.user). */
  get _delegate() {
    return prisma[this.model];
  }

  // ─── FIND ──────────────────────────────────────────────────────────────────

  /**
   * Find a single record by primary key.
   *
   * @param {string}  id
   * @param {object}  [include]  Prisma include clause.
   * @returns {object|null}
   */
  async findById(id, include = undefined) {
    this.log.debug('findById', { id });
    const where = this._notDeleted({ id });
    return this._delegate.findFirst({ where, include });
  }

  /**
   * Find a single record matching an arbitrary where clause.
   *
   * @param {object}  where
   * @param {object}  [include]
   * @returns {object|null}
   */
  async findOne(where, include = undefined) {
    return this._delegate.findFirst({ where: this._notDeleted(where), include });
  }

  /**
   * Find all records matching a where clause (unpaginated).
   *
   * @param {object}  where
   * @param {object}  [opts]
   * @param {object}  [opts.orderBy]
   * @param {object}  [opts.include]
   * @param {object}  [opts.select]
   * @returns {Array}
   */
  async findMany(where = {}, opts = {}) {
    const { orderBy, include, select } = opts;
    return this._delegate.findMany({
      where   : this._notDeleted(where),
      orderBy,
      include,
      select,
    });
  }

  // ─── PAGINATE ──────────────────────────────────────────────────────────────

  /**
   * Paginated list with optional search.
   *
   * @param {object} query          Express req.query (page, limit, sortBy, sortOrder, q).
   * @param {object} [baseWhere]    Additional where filters (e.g. { companyId }).
   * @param {object} [opts]
   * @param {object} [opts.include]
   * @param {object} [opts.select]
   * @param {object} [opts.orderBy] Overrides sortBy/sortOrder from query.
   * @returns {{ data: Array, meta: object }}
   */
  async paginate(query = {}, baseWhere = {}, opts = {}) {
    const { skip, take, page, limit } = parsePagination(query);

    const orderBy = opts.orderBy ?? {
      [query.sortBy || 'createdAt']: query.sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const searchClause  = buildPrismaSearch(this.searchFields, query.q);
    const mergedWhere   = mergeWithSearch(this._notDeleted(baseWhere), searchClause);

    const [data, total] = await prisma.$transaction([
      this._delegate.findMany({
        where   : mergedWhere,
        skip,
        take,
        orderBy,
        include : opts.include,
        select  : opts.select,
      }),
      this._delegate.count({ where: mergedWhere }),
    ]);

    return { data, meta: buildMeta(total, page, limit) };
  }

  // ─── WRITE ─────────────────────────────────────────────────────────────────

  /**
   * Create a new record.
   *
   * @param {object}  data
   * @param {object}  [include]
   * @returns {object}
   */
  async create(data, include = undefined) {
    this.log.debug('create', { model: this.model });
    return this._delegate.create({ data, include });
  }

  /**
   * Update a record by ID.
   *
   * @param {string}  id
   * @param {object}  data
   * @param {object}  [include]
   * @returns {object}
   */
  async updateById(id, data, include = undefined) {
    this.log.debug('updateById', { id, model: this.model });
    return this._delegate.update({ where: { id }, data, include });
  }

  /**
   * Update all records matching a where clause.
   *
   * @param {object}  where
   * @param {object}  data
   * @returns {{ count: number }}
   */
  async updateMany(where, data) {
    return this._delegate.updateMany({ where: this._notDeleted(where), data });
  }

  /**
   * Create or update a record (upsert).
   *
   * @param {object}  where
   * @param {object}  create
   * @param {object}  update
   * @returns {object}
   */
  async upsert(where, create, update) {
    return this._delegate.upsert({ where, create, update });
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  /**
   * Soft-delete a record by ID (sets deletedAt = now()).
   * Falls back to hard delete if softDelete is disabled on this repo.
   *
   * @param {string} id
   * @returns {object}
   */
  async softDeleteById(id) {
    if (!this.softDelete) {
      this.log.warn('softDeleteById called on non-soft-delete model', { model: this.model });
      return this.hardDeleteById(id);
    }
    this.log.debug('softDeleteById', { id, model: this.model });
    return this._delegate.update({
      where : { id },
      data  : { deletedAt: new Date() },
    });
  }

  /**
   * Hard-delete a record by ID — permanent, use with care.
   *
   * @param {string} id
   * @returns {object}
   */
  async hardDeleteById(id) {
    this.log.debug('hardDeleteById', { id, model: this.model });
    return this._delegate.delete({ where: { id } });
  }

  /**
   * Restore a soft-deleted record (clears deletedAt).
   *
   * @param {string} id
   * @returns {object}
   */
  async restoreById(id) {
    if (!this.softDelete) throw AppError.badRequest('This model does not support soft delete.');
    return this._delegate.update({ where: { id }, data: { deletedAt: null } });
  }

  // ─── COUNT ─────────────────────────────────────────────────────────────────

  /**
   * Count records matching a where clause.
   *
   * @param {object} where
   * @returns {number}
   */
  async count(where = {}) {
    return this._delegate.count({ where: this._notDeleted(where) });
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────

  /**
   * Run multiple Prisma operations in a single transaction.
   *
   * @param {Function} fn  Receives `tx` (transactional Prisma client).
   * @returns {*}          Return value of fn.
   *
   * @example
   *   await userRepo.transaction(async (tx) => {
   *     await tx.user.create({ data: userData });
   *     await tx.company.update({ where: { id }, data: { maxUsers: { increment: 1 } } });
   *   });
   */
  async transaction(fn) {
    return prisma.$transaction(fn);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Appends `deletedAt: null` to a where clause when softDelete is enabled.
   * @param {object} where
   * @returns {object}
   */
  _notDeleted(where = {}) {
    if (!this.softDelete) return where;
    return { ...where, deletedAt: null };
  }

  /**
   * Assert a record exists or throw 404.
   * @param {string}  id
   * @param {string}  [label]  Human-readable label for the error message.
   * @returns {object}
   */
  async findByIdOrFail(id, label) {
    const record = await this.findById(id);
    if (!record) throw AppError.notFound(label || this.model);
    return record;
  }
}

module.exports = BaseRepository;
