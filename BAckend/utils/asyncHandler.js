/**
 * asyncHandler.js — Async route handler wrapper.
 *
 * Eliminates try/catch boilerplate in route handlers by catching any rejected
 * promise and forwarding the error to Express's next() error middleware.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await UserService.getAll();
 *     res.json({ success: true, data: users });
 *   }));
 */

'use strict';

/**
 * Wraps an async Express route handler so unhandled rejections are forwarded
 * to the next() error handler instead of crashing the process.
 *
 * @param {Function} fn  Async (req, res, next) handler.
 * @returns {Function}   Standard Express middleware.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
