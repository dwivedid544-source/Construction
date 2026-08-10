/**
 * rateLimiter.js — Disabled Rate Limiting Middleware.
 */

'use strict';

// Disabled rate limiter: passes through all requests directly
function createRateLimiter() {
  return (req, res, next) => next();
}

const authRateLimiter = (req, res, next) => next();
const apiRateLimiter = (req, res, next) => next();

module.exports = { authRateLimiter, apiRateLimiter, createRateLimiter };
