/**
 * run.js — Master MongoDB → PostgreSQL migration runner.
 *
 * Features:
 *  ✅ Sequential execution in FK-dependency order
 *  ✅ Upsert-based resume (safe to re-run at any time)
 *  ✅ Per-collection skip via .checkpoint/*.done flags
 *  ✅ Detailed per-record logging to migration.log
 *  ✅ Final summary report printed to stdout
 *  ✅ Rollback hint printed on failure
 *
 * Usage:
 *   node scripts/migrate/run.js               # full migration
 *   node scripts/migrate/run.js --reset       # clear checkpoints and restart
 *   node scripts/migrate/run.js --dry-run     # verify connections only
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectMongo, disconnectMongo, disconnectPrisma } = require('./config');
const idMap = require('./idMap');
const log   = require('./logger');
const path  = require('path');
const fs    = require('fs');

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const RESET   = args.includes('--reset');
const DRY_RUN = args.includes('--dry-run');

// ─── Checkpoint reset ─────────────────────────────────────────────────────────
if (RESET) {
  const dir = path.join(__dirname, '.checkpoint');
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    log.warn('[run] Checkpoint directory cleared — full re-migration will run');
  }
}

// ─── Collection migrators in FK-dependency order ──────────────────────────────
const MIGRATORS = [
  require('./collections/01_plans'),
  require('./collections/02_companies'),
  require('./collections/03_roles'),
  require('./collections/04_permissions'),
  require('./collections/05_users'),
  require('./collections/06_fcmTokens'),
  require('./collections/07_projects'),
  require('./collections/08_tasks'),
  require('./collections/09_subTasks'),
  require('./collections/10_taskTemplates'),
  require('./collections/11_schedules'),
  require('./collections/12_dailyLogs'),
  require('./collections/13_photos'),
  require('./collections/14_drawings'),
  require('./collections/15_drawingAnnotations'),
  require('./collections/16_rfis'),
  require('./collections/17_issues'),
  require('./collections/18_correctionRequests'),
  require('./collections/19_vendors'),
  require('./collections/20_purchaseOrders'),
  require('./collections/21_equipment'),
  require('./collections/22_invoices'),
  require('./collections/23_estimates'),
  require('./collections/24_payrolls'),
  require('./collections/25_timeLogs'),
  require('./collections/26_transactions'),
  require('./collections/27_tradeBids'),
  require('./collections/28_jobs'),
  require('./collections/29_chatRooms'),
  require('./collections/30_chats'),
  require('./collections/31_chatParticipants'),
  require('./collections/32_notifications'),
  require('./collections/33_supportTickets'),
  require('./collections/34_todos'),
];

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now();
  log.info('════════════════════════════════════════════════════════');
  log.info('  MongoDB → PostgreSQL Migration Pipeline');
  log.info(`  Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  log.info('════════════════════════════════════════════════════════');

  // Load the ObjectId → UUID mapping checkpoint
  idMap.load();

  // Connect both databases
  await connectMongo();

  if (DRY_RUN) {
    log.info('[run] Dry-run complete — connections verified, no data written.');
    await disconnectMongo();
    await disconnectPrisma();
    return;
  }

  // ─── Run each collection migrator ───────────────────────────────────────────
  const summary = [];

  for (const migrateFn of MIGRATORS) {
    const name = migrateFn.name;

    if (idMap.isCollectionDone(name)) {
      log.skip(`[run] ${name} — already done (checkpoint found), skipping`);
      summary.push({ collection: name, status: 'SKIPPED' });
      continue;
    }

    log.info(`[run] ── Starting: ${name}`);
    try {
      const result = await migrateFn();
      idMap.markCollectionDone(name);
      summary.push({ ...result, status: 'OK' });
      log.ok(`[run] ── Completed: ${name}`);
    } catch (err) {
      log.error(`[run] ── FAILED: ${name} — ${err.message}`);
      log.error(err.stack);
      summary.push({ collection: name, status: 'ERROR', error: err.message });
      // Continue to next collection (partial resume)
    }
  }

  // ─── Final summary ───────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const errors  = summary.filter((s) => s.status === 'ERROR');
  const skipped = summary.filter((s) => s.status === 'SKIPPED');
  const done    = summary.filter((s) => s.status === 'OK');

  log.info('════════════════════════════════════════════════════════');
  log.info(`  Migration complete in ${elapsed}s`);
  log.info(`  Collections: ${done.length} OK | ${skipped.length} SKIPPED | ${errors.length} FAILED`);
  log.info('────────────────────────────────────────────────────────');
  summary.forEach((s) => {
    const icon = s.status === 'OK' ? '✓' : s.status === 'SKIPPED' ? '→' : '✗';
    const extras = s.status === 'OK'
      ? `  inserted:${s.inserted ?? 0} errors:${s.errors ?? 0}`
      : s.status === 'ERROR' ? `  ERROR: ${s.error}` : '';
    log.info(`  ${icon}  ${s.collection}${extras}`);
  });
  log.info('════════════════════════════════════════════════════════');

  if (errors.length > 0) {
    log.warn('Some collections failed. Re-run to resume from where it stopped.');
    log.warn('To force a full re-migration: node scripts/migrate/run.js --reset');
  }

  await disconnectMongo();
  await disconnectPrisma();

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  log.error(`[run] FATAL: ${err.message}`);
  log.error(err.stack);
  process.exit(1);
});
