/**
 * scripts/migrate/idMap.js
 *
 * ObjectId → UUID mapping store.
 *
 * Generates deterministic UUIDs from MongoDB ObjectId strings using uuid v5
 * with a fixed namespace. This means:
 *  - The same ObjectId always maps to the same UUID
 *  - Re-running the migration produces identical IDs → safe for upsert
 *  - No need for a database lookup to resolve IDs
 *
 * The in-memory map is also persisted to a checkpoint file so migration can
 * resume after a failure without re-processing already-migrated collections.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { v5: uuidv5, v4: uuidv4 } = require('uuid');

// ─── UUID v5 namespace (fixed — do NOT change after first run) ────────────────
// This is a randomly generated namespace UUID used as the seed for all mappings.
const NAMESPACE = '6ba7b814-9dad-11d1-80b4-00c04fd430c8'; // UUID namespace for URLs (RFC 4122)

const CHECKPOINT_DIR  = path.resolve(__dirname, '.checkpoint');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, 'idmap.json');

// In-memory store: mongoId (string) → uuid (string)
let _map = {};

// ─── Load existing checkpoint ─────────────────────────────────────────────────
function load() {
  if (!fs.existsSync(CHECKPOINT_DIR)) fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      _map = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      console.log(`[idMap] Loaded ${Object.keys(_map).length} existing ID mappings from checkpoint.`);
    } catch {
      _map = {};
    }
  }
}

// ─── Save checkpoint ──────────────────────────────────────────────────────────
function save() {
  if (!fs.existsSync(CHECKPOINT_DIR)) fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(_map, null, 2));
}

/**
 * Get (or create) the deterministic UUID for a MongoDB ObjectId string.
 *
 * @param {string|object} mongoId  MongoDB ObjectId or its string representation.
 * @returns {string}               UUID string.
 */
function getUuid(mongoId) {
  if (!mongoId) return null;
  const key = String(mongoId);
  if (!_map[key]) {
    _map[key] = uuidv5(key, NAMESPACE);
  }
  return _map[key];
}

/**
 * Generate a fresh UUID for a record that has no MongoDB ID (rare edge case).
 * @returns {string}
 */
function newUuid() {
  return uuidv4();
}

/**
 * Check whether a checkpoint file exists for a given collection name.
 * Used to skip already-completed collections on resume.
 */
function isCollectionDone(collectionName) {
  const flag = path.join(CHECKPOINT_DIR, `${collectionName}.done`);
  return fs.existsSync(flag);
}

/**
 * Mark a collection as done (creates a flag file).
 */
function markCollectionDone(collectionName) {
  const flag = path.join(CHECKPOINT_DIR, `${collectionName}.done`);
  fs.writeFileSync(flag, new Date().toISOString());
  save(); // also persist idmap
}

module.exports = { load, save, getUuid, newUuid, isCollectionDone, markCollectionDone };
