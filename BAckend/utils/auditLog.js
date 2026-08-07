/**
 * auditLog.js — Centralised audit logging helper.
 *
 * All writes go exclusively to PostgreSQL (AuditLog table) regardless of the
 * active DB_DRIVER. This ensures a single source of truth for compliance,
 * reporting, and transactional consistency.
 *
 * Usage:
 *   const { logAction } = require('../utils/auditLog');
 *
 *   await logAction({
 *     userId    : req.user.id,
 *     companyId : req.user.companyId,
 *     action    : 'CREATE',
 *     resource  : 'Project',
 *     resourceId: project.id,
 *     details   : { name: project.name },
 *     req,                         // optional — extracts IP from request
 *   });
 *
 * Errors are caught and logged to console so they never crash the caller.
 */

'use strict';

const logger = require('./logger').scope('AuditLog');

// Lazy-load the real PrismaClient to avoid circular dependency issues
let _prisma = null;
function getPrisma() {
  if (!_prisma) {
    const { PrismaClient } = require('@prisma/client');
    // Re-use the global singleton in dev to avoid connection storms
    _prisma = global.__auditPrisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') global.__auditPrisma = _prisma;
  }
  return _prisma;
}

/**
 * Extract the best available client IP from a request.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractIp(req) {
  if (!req) return null;
  return (
    (req.headers && req.headers['x-forwarded-for']?.split(',')[0].trim()) ||
    req.ip ||
    req.connection?.remoteAddress ||
    null
  );
}

/**
 * Write one audit log entry to PostgreSQL.
 *
 * @param {object}  options
 * @param {string}  [options.userId]     ID of the user performing the action.
 * @param {string}  [options.companyId]  Tenant company ID.
 * @param {string}  options.action       Verb: CREATE | UPDATE | DELETE | LOGIN | etc.
 * @param {string}  [options.resource]   Model name: 'Project', 'User', …
 * @param {string}  [options.resourceId] ID of the affected record.
 * @param {object}  [options.details]    Arbitrary JSON payload (diff, metadata, …).
 * @param {object}  [options.req]        Express request (used to extract IP).
 * @returns {Promise<void>}
 */
async function logAction({ userId, companyId, action, resource, resourceId, details, req }) {
  try {
    const prisma = getPrisma();
    await prisma.auditLog.create({
      data: {
        userId    : userId    ?? null,
        companyId : companyId ?? null,
        action    : String(action).toUpperCase(),
        resource  : resource  ?? null,
        details   : details   ? { resourceId, ...details } : (resourceId ? { resourceId } : undefined),
        ipAddress : extractIp(req),
      },
    });
  } catch (err) {
    // Audit failures must never block the primary request
    logger.error('Failed to write audit log', err, { action, resource, userId });
  }
}

/**
 * Middleware factory that automatically logs every mutating request.
 * Attach to a router to audit all POST/PUT/PATCH/DELETE routes.
 *
 * @param {string} resource  Model name (e.g. 'Project').
 * @returns {import('express').RequestHandler}
 */
function auditMiddleware(resource) {
  return (req, res, next) => {
    const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!MUTATING.includes(req.method)) return next();

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = req.method === 'POST'   ? 'CREATE'
                     : req.method === 'DELETE' ? 'DELETE'
                     : 'UPDATE';

        logAction({
          userId    : req.user?.id || req.user?._id?.toString(),
          companyId : req.user?.companyId,
          action,
          resource,
          resourceId: req.params?.id,
          req,
        });
      }
    });

    next();
  };
}

module.exports = { logAction, auditMiddleware };
