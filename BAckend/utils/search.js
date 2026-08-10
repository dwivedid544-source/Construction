/**
 * search.js — Full-text search clause builders for Prisma and Mongoose.
 *
 * Generates OR clauses across a set of searchable fields from a single search
 * term, keeping controllers clean and search logic centralised.
 *
 * Usage — Prisma:
 *   const { buildPrismaSearch } = require('../utils/search');
 *   const searchClause = buildPrismaSearch(['name', 'email'], req.query.q);
 *   // → { OR: [{ name: { contains: 'term', mode: 'insensitive' } }, ...] }
 *   prisma.user.findMany({ where: { companyId, ...searchClause } });
 *
 * Usage — Mongoose:
 *   const { buildMongoSearch } = require('../utils/search');
 *   const searchClause = buildMongoSearch(['name', 'email'], req.query.q);
 *   // → { $or: [{ name: /term/i }, { email: /term/i }] }
 *   User.find({ companyId, ...searchClause });
 */

'use strict';

/**
 * Build a Prisma OR search clause (case-insensitive contains).
 *
 * @param {string[]} fields  Model fields to search across.
 * @param {string}   term    Search string from the query parameter.
 * @returns {object}         Prisma `where` fragment, or {} if term is empty.
 */
function buildPrismaSearch(fields, term) {
  if (!term || typeof term !== 'string' || !term.trim()) return {};

  const sanitised = term.trim();

  return {
    OR: fields.map((field) => ({
      [field]: { contains: sanitised, mode: 'insensitive' },
    })),
  };
}

/**
 * Build a Mongoose $or search clause using case-insensitive regex.
 *
 * @param {string[]} fields  Schema paths to search across.
 * @param {string}   term    Search string from the query parameter.
 * @returns {object}         Mongoose filter fragment, or {} if term is empty.
 */
function buildMongoSearch(fields, term) {
  if (!term || typeof term !== 'string' || !term.trim()) return {};

  const regex = new RegExp(term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
}

/**
 * Merge a base WHERE clause with a search clause (Prisma).
 * When both have OR/AND clauses this safely wraps them in an AND.
 *
 * @param {object} base    Existing where clause (e.g. { companyId, status }).
 * @param {object} search  Result of buildPrismaSearch().
 * @returns {object}       Merged Prisma where clause.
 */
function mergeWithSearch(base, search) {
  if (!search || !search.OR) return base;
  if (!base || Object.keys(base).length === 0) return search;

  return { AND: [base, search] };
}

module.exports = { buildPrismaSearch, buildMongoSearch, mergeWithSearch };
