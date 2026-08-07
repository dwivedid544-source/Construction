/**
 * scripts/migrate/config.js
 *
 * Shared configuration for the MongoDB → PostgreSQL migration pipeline.
 * Provides a MongoDB connection and the Prisma client singleton.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose   = require('mongoose');
const { PrismaClient } = require('@prisma/client');

// ─── Prisma singleton ─────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// ─── MongoDB connection ───────────────────────────────────────────────────────
async function connectMongo() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-saas';
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.log('[migrate/config] WARNING: MONGO_URI not set in .env, attempting local fallback: ' + uri);
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('[migrate/config] MongoDB connected');
}

async function disconnectMongo() {
  await mongoose.disconnect();
  console.log('[migrate/config] MongoDB disconnected');
}

async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('[migrate/config] Prisma disconnected');
}

module.exports = { prisma, connectMongo, disconnectMongo, disconnectPrisma };
