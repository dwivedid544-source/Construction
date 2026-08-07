/**
 * errorMiddleware.js — Production-grade Express error handler.
 *
 * Handles:
 *  - AppError         → uses its statusCode and code
 *  - Prisma errors    → P2002 (unique), P2025 (not found), P2003 (FK)
 *  - Joi errors       → validation failures forwarded as AppError.validation
 *  - JWT errors       → 401 Unauthorized
 *  - CastErrors       → 400 Bad Request (Mongoose ObjectId)
 *  - All others       → 500 Internal Server Error
 *
 * All 5xx errors are logged with a full stack trace.
 * Response shape is always:
 *   { success: false, message, code, errors?: [{field, message}] }
 */

'use strict';

const logger  = require('../utils/logger').scope('ErrorHandler');
const AppError = require('../utils/AppError');

// ─── Prisma error code → HTTP status mapping ─────────────────────────────────
const PRISMA_CODE_MAP = {
  P2002 : { status: 409, code: 'CONFLICT',      message: 'A record with this value already exists.' },
  P2025 : { status: 404, code: 'NOT_FOUND',     message: 'Record not found.' },
  P2003 : { status: 400, code: 'BAD_REQUEST',   message: 'Related record does not exist.' },
  P2014 : { status: 400, code: 'BAD_REQUEST',   message: 'Invalid relation.' },
  P2016 : { status: 400, code: 'BAD_REQUEST',   message: 'Query interpretation error.' },
  P2021 : { status: 500, code: 'DB_ERROR',      message: 'Table does not exist in the database.' },
  P2022 : { status: 500, code: 'DB_ERROR',      message: 'Column does not exist in the database.' },
};

/**
 * Normalise any thrown error into a structured response.
 */
function errorHandler(err, req, res, next) {   // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let code       = err.code       || 'INTERNAL_ERROR';
  let message    = err.message    || 'An unexpected error occurred.';
  let errors     = err.errors     || [];

  // ─── AppError (our own structured errors) ────────────────────────────────
  if (err instanceof AppError) {
    // Already fully structured — just log 5xx
    if (statusCode >= 500) logger.error(`[${code}] ${message}`, err);
    return res.status(statusCode).json({ success: false, message, code, errors });
  }

  // ─── Joi ValidationError ─────────────────────────────────────────────────
  if (err.isJoi || err.name === 'ValidationError' && err.details) {
    statusCode = 422;
    code       = 'VALIDATION_ERROR';
    message    = 'Validation failed';
    errors     = (err.details || []).map((d) => ({
      field   : d.path?.join('.') || d.context?.key || 'unknown',
      message : d.message.replace(/['"]/g, ''),
    }));
    return res.status(statusCode).json({ success: false, message, code, errors });
  }

  // ─── Prisma errors ───────────────────────────────────────────────────────
  if (err.code && err.code.startsWith('P')) {
    const mapped = PRISMA_CODE_MAP[err.code];
    if (mapped) {
      statusCode = mapped.status;
      code       = mapped.code;
      message    = mapped.message;

      // P2002: include the field that caused the unique constraint violation
      if (err.code === 'P2002' && err.meta?.target) {
        const fields = Array.isArray(err.meta.target) ? err.meta.target : [err.meta.target];
        message = `${fields.join(', ')} already exists.`;
        errors  = fields.map((f) => ({ field: f, message: `${f} already exists.` }));
      }

      if (statusCode >= 500) logger.error(`[Prisma ${err.code}] ${message}`, err);
      return res.status(statusCode).json({ success: false, message, code, errors });
    }
  }

  // ─── JWT errors ──────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code       = 'UNAUTHORIZED';
    message    = err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
    return res.status(statusCode).json({ success: false, message, code, errors });
  }

  // ─── Mongoose CastError (invalid ObjectId) ───────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    code       = 'BAD_REQUEST';
    message    = `Invalid value for field '${err.path}'.`;
    return res.status(statusCode).json({ success: false, message, code, errors });
  }

  // ─── Mongoose duplicate key (code 11000) ─────────────────────────────────
  if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    code       = 'CONFLICT';
    const field = Object.keys(err.keyValue)[0];
    message    = `${field} already exists.`;
    errors     = [{ field, message }];
    return res.status(statusCode).json({ success: false, message, code, errors });
  }

  // ─── Unknown / programmer error ──────────────────────────────────────────
  logger.error(`[UNHANDLED] ${message}`, err);

  res.status(500).json({
    success : false,
    message : process.env.NODE_ENV === 'production' ? 'Internal server error.' : message,
    code    : 'INTERNAL_ERROR',
    errors  : [],
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };

