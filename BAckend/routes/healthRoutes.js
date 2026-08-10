/**
 * healthRoutes.js — Production Health, Liveness & Database Readiness Check Endpoint.
 */

'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

router.get('/', async (req, res) => {
  const startedAt = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = `unhealthy (${err.message})`;
  }

  const isOk = dbStatus === 'healthy';
  const memUsage = process.memoryUsage();

  res.status(isOk ? 200 : 503).json({
    status: isOk ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      provider: 'postgresql',
    },
    memory: {
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
    responseTimeMs: Date.now() - startedAt,
  });
});

module.exports = router;
