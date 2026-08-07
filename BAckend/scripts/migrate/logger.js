/**
 * scripts/migrate/logger.js
 *
 * Migration-specific logger that writes to both console and a migration.log file.
 * Keeps a persistent record of every migrated record and any errors.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.resolve(__dirname, 'migration.log');

// Ensure log file exists
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const log = {
  info  : (msg) => write('INFO',    msg),
  warn  : (msg) => write('WARN',    msg),
  error : (msg) => write('ERROR',   msg),
  ok    : (msg) => write('SUCCESS', msg),
  skip  : (msg) => write('SKIP',    msg),
};

module.exports = log;
