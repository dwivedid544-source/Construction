'use strict';

const rateLimitCache = new Map();

/**
 * Custom memory-based rate limiter middleware
 */
function customRateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitCache.has(ip)) {
      rateLimitCache.set(ip, []);
    }
    
    const requests = rateLimitCache.get(ip).filter(timestamp => now - timestamp < windowMs);
    requests.push(now);
    rateLimitCache.set(ip, requests);
    
    if (requests.length > max) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.'
      });
    }
    next();
  };
}

const authRateLimiter = customRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many authentication/verification requests. Please try again after 15 minutes.'
});

const apiRateLimiter = customRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many API requests. Please try again after a minute.'
});

module.exports = { authRateLimiter, apiRateLimiter, customRateLimiter };
