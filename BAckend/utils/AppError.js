/**
 * AppError — Structured application error class.
 *
 * Extends native Error with an HTTP statusCode, a machine-readable `code`,
 * optional field-level `errors` (for validation failures), and an
 * `isOperational` flag that distinguishes expected failures (4xx) from
 * unexpected programmer errors (5xx).
 *
 * Usage:
 *   throw new AppError('User not found', 404, 'NOT_FOUND');
 *   throw new AppError('Validation failed', 422, 'VALIDATION_ERROR', fields);
 */

'use strict';

class AppError extends Error {
  /**
   * @param {string}  message     Human-readable message sent to the client.
   * @param {number}  statusCode  HTTP status code (400, 401, 403, 404, 409, 422, 500…).
   * @param {string}  [code]      Machine-readable error code.
   * @param {Array}   [errors]    Optional array of field-level validation errors.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', errors = []) {
    super(message);

    this.name        = 'AppError';
    this.statusCode  = statusCode;
    this.code        = code;
    this.errors      = errors;           // [{field, message}]
    this.isOperational = statusCode < 500; // true → expected failure, false → programmer bug

    // Capture a clean stack trace excluding this constructor frame
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Static factory helpers ───────────────────────────────────────────────────

/** 400 Bad Request */
AppError.badRequest = (message, errors = []) =>
  new AppError(message, 400, 'BAD_REQUEST', errors);

/** 401 Unauthorized */
AppError.unauthorized = (message = 'Not authorized') =>
  new AppError(message, 401, 'UNAUTHORIZED');

/** 403 Forbidden */
AppError.forbidden = (message = 'Access denied') =>
  new AppError(message, 403, 'FORBIDDEN');

/** 404 Not Found */
AppError.notFound = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

/** 409 Conflict */
AppError.conflict = (message) =>
  new AppError(message, 409, 'CONFLICT');

/** 422 Unprocessable Entity (validation) */
AppError.validation = (message, errors = []) =>
  new AppError(message, 422, 'VALIDATION_ERROR', errors);

/** 429 Too Many Requests */
AppError.tooManyRequests = (message = 'Too many requests') =>
  new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');

/** 500 Internal Server Error */
AppError.internal = (message = 'Internal server error') =>
  new AppError(message, 500, 'INTERNAL_ERROR');

module.exports = AppError;
