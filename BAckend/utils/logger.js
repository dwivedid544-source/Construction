/**
 * logger.js — Structured application logger.
 *
 * Lightweight, zero-dependency logger that wraps console methods with:
 *  - ISO-8601 timestamps
 *  - Log-level labels  [INFO] | [WARN] | [ERROR] | [DEBUG]
 *  - Optional module/context prefix
 *  - Debug suppressed in production
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('Server started');
 *   logger.error('DB connection failed', err);
 *
 *   // Scoped logger for a module:
 *   const log = logger.scope('UserRepository');
 *   log.debug('findById called', { id });
 */

'use strict';

const isProd = process.env.NODE_ENV === 'production';

// ─── ANSI colour codes (disabled in production) ──────────────────────────────
const COLOURS = isProd
  ? { reset: '', info: '', warn: '', error: '', debug: '', dim: '' }
  : {
      reset : '\x1b[0m',
      info  : '\x1b[36m',   // cyan
      warn  : '\x1b[33m',   // yellow
      error : '\x1b[31m',   // red
      debug : '\x1b[90m',   // grey
      dim   : '\x1b[2m',
    };

// ─── Core formatter ──────────────────────────────────────────────────────────
function format(level, scope, args) {
  const ts    = new Date().toISOString();
  const label = `[${level}]`;
  const ctx   = scope ? `[${scope}]` : '';
  const colour = COLOURS[level.toLowerCase()] || '';

  // Separate Error objects so their stacks print cleanly
  const extras = args.map(a => {
    if (a instanceof Error) return `\n${a.stack || a.message}`;
    if (typeof a === 'object' && a !== null) {
      try { return '\n' + JSON.stringify(a, null, 2); } catch { return String(a); }
    }
    return String(a);
  });

  return `${COLOURS.dim}${ts}${COLOURS.reset} ${colour}${label}${COLOURS.reset} ${ctx} ${extras.join(' ')}`;
}

// ─── Logger factory ──────────────────────────────────────────────────────────
function createLogger(scope = '') {
  return {
    info  : (...args) => console.log(format('INFO',  scope, args)),
    warn  : (...args) => console.warn(format('WARN',  scope, args)),
    error : (...args) => console.error(format('ERROR', scope, args)),
    debug : (...args) => { if (!isProd) console.debug(format('DEBUG', scope, args)); },

    /** Create a child logger with an additional scope label. */
    scope : (label) => createLogger(scope ? `${scope}:${label}` : label),

    /**
     * HTTP request/response logger (call in middleware).
     * @param {import('express').Request}  req
     * @param {import('express').Response} res
     * @param {number} durationMs
     */
    http : (req, res, durationMs) => {
      const line = `${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`;
      if (res.statusCode >= 500) return console.error(format('ERROR', 'HTTP', [line]));
      if (res.statusCode >= 400) return console.warn(format('WARN',  'HTTP', [line]));
      console.log(format('INFO', 'HTTP', [line]));
    },
  };
}

module.exports = createLogger();
