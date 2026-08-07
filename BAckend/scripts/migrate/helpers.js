/**
 * scripts/migrate/helpers.js
 *
 * Shared data conversion utilities for the migration pipeline.
 */

'use strict';

const idMap = require('./idMap');

/**
 * Convert a MongoDB ObjectId (or null/undefined) to a PostgreSQL UUID.
 * Returns null if the input is falsy.
 *
 * @param {*} id  ObjectId, ObjectId.toString(), or null.
 * @returns {string|null}
 */
function toUuid(id) {
  if (id === null || id === undefined) return null;
  return idMap.getUuid(String(id));
}

/**
 * Convert a MongoDB Date, string, or timestamp to a JS Date object.
 * Returns null for invalid/missing dates.
 *
 * @param {*} value
 * @returns {Date|null}
 */
function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Safely stringify a value as a JSON-compatible object (for Prisma Json fields).
 * Falls back to null if the value cannot be serialised.
 *
 * @param {*} value
 * @returns {object|Array|null}
 */
function toJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    try {
      // Round-trip through JSON to strip any non-serialisable values
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

/**
 * Convert a MongoDB array of ObjectIds to an array of UUIDs.
 *
 * @param {Array} arr
 * @returns {string[]}
 */
function toUuidArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(toUuid).filter(Boolean);
}

/**
 * Convert a MongoDB array of strings/primitives, stripping null entries.
 *
 * @param {Array} arr
 * @returns {string[]}
 */
function toStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(String).filter(Boolean);
}

/**
 * Safely trim and return a string, or null if empty/missing.
 *
 * @param {*} value
 * @returns {string|null}
 */
function cleanStr(value) {
  if (!value && value !== 0) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/**
 * Parse a float from a value, returning a default if NaN.
 *
 * @param {*} value
 * @param {number} [defaultValue=0]
 * @returns {number}
 */
function toFloat(value, defaultValue = 0) {
  const n = parseFloat(value);
  return isNaN(n) ? defaultValue : n;
}

/**
 * Parse an integer from a value, returning a default if NaN.
 *
 * @param {*} value
 * @param {number} [defaultValue=0]
 * @returns {number}
 */
function toInt(value, defaultValue = 0) {
  const n = parseInt(value, 10);
  return isNaN(n) ? defaultValue : n;
}

/**
 * Batch an array into chunks of a given size.
 *
 * @param {Array}  arr
 * @param {number} size
 * @returns {Array[]}
 */
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

module.exports = { toUuid, toDate, toJson, toUuidArray, toStringArray, cleanStr, toFloat, toInt, chunk };
