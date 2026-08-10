/**
 * pagination.js — Pagination helpers for Prisma and Mongoose queries.
 *
 * Centralises all page/limit parsing and metadata construction so every
 * list endpoint returns a consistent shape:
 *
 *   {
 *     data: [...],
 *     meta: { total, page, limit, totalPages, hasNext, hasPrev }
 *   }
 *
 * Usage — Prisma:
 *   const { skip, take, page, limit } = parsePagination(req.query);
 *   const [data, total] = await prisma.$transaction([
 *     prisma.user.findMany({ where, skip, take }),
 *     prisma.user.count({ where }),
 *   ]);
 *   res.json(buildPaginatedResponse(data, total, page, limit));
 *
 * Usage — Mongoose:
 *   const { skip, take, page, limit } = parsePagination(req.query);
 *   const [data, total] = await Promise.all([
 *     User.find(filter).skip(skip).limit(take).lean(),
 *     User.countDocuments(filter),
 *   ]);
 *   res.json(buildPaginatedResponse(data, total, page, limit));
 */

'use strict';

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

/**
 * Parse page / limit from query string with sensible defaults and caps.
 *
 * @param {object} query  Express req.query (or any plain object).
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
function parsePagination(query = {}) {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page)  || page  < 1) page  = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT)         limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

/**
 * Build pagination metadata.
 *
 * @param {number} total   Total records matching the query.
 * @param {number} page    Current page (1-indexed).
 * @param {number} limit   Records per page.
 * @returns {object}       Pagination meta object.
 */
function buildMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext : page < totalPages,
    hasPrev : page > 1,
  };
}

/**
 * Build a complete paginated API response envelope.
 *
 * @param {Array}  data    The current page of records.
 * @param {number} total   Total records matching the query.
 * @param {number} page    Current page.
 * @param {number} limit   Page size.
 * @returns {{ success: true, data: Array, meta: object }}
 */
function buildPaginatedResponse(data, total, page, limit) {
  return {
    success : true,
    data,
    meta    : buildMeta(total, page, limit),
  };
}

/**
 * Parse sort order from query string.
 * Supports:   ?sortBy=createdAt&sortOrder=desc
 * Defaults:   { createdAt: 'desc' }
 *
 * @param {object} query           Express req.query.
 * @param {string} [defaultField]  Default sort field.
 * @returns {{ [field]: 'asc'|'desc' }}  Prisma-compatible orderBy object.
 */
function parseOrderBy(query = {}, defaultField = 'createdAt') {
  const field = query.sortBy    || defaultField;
  const dir   = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { [field]: dir };
}

module.exports = { parsePagination, buildMeta, buildPaginatedResponse, parseOrderBy };
