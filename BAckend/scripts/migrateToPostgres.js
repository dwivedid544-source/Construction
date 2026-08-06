/**
 * ETL Migration Script: MongoDB -> PostgreSQL via Prisma
 * Usage: node scripts/migrateToPostgres.js
 */

const mongoose = require('mongoose');
const prisma = require('../config/prisma');

// Import Mongoose Models
const User = require('../models/User');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const Project = require('../models/Project');
const Task = require('../models/Task');
const DailyLog = require('../models/DailyLog');

async function migrateData() {
  console.log('Starting ETL Data Migration from MongoDB to PostgreSQL...');

  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas_const');
      console.log('Connected to MongoDB.');
    }

    // 1. Migrate Plans
    const plans = await Plan.find({}).lean();
    console.log(`Migrating ${plans.length} Plans...`);
    for (const p of plans) {
      await prisma.plan.upsert({
        where: { id: p._id.toString() },
        update: { name: p.name, price: p.price || 0 },
        create: {
          id: p._id.toString(),
          name: p.name,
          price: p.price || 0,
          period: p.period || 'month',
          maxProjects: p.maxProjects || 5,
          maxUsers: p.maxUsers || 10
        }
      });
    }

    // 2. Migrate Companies
    const companies = await Company.find({}).lean();
    console.log(`Migrating ${companies.length} Companies...`);
    for (const c of companies) {
      await prisma.company.upsert({
        where: { id: c._id.toString() },
        update: { name: c.name, email: c.email || null },
        create: {
          id: c._id.toString(),
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          address: c.address || null,
          subscriptionStatus: c.subscriptionStatus || 'active'
        }
      });
    }

    // 3. Migrate Users
    const users = await User.find({}).lean();
    console.log(`Migrating ${users.length} Users...`);
    for (const u of users) {
      if (!u.email) continue;
      await prisma.user.upsert({
        where: { email: u.email.toLowerCase() },
        update: { name: u.fullName || u.name || 'User' },
        create: {
          id: u._id.toString(),
          name: u.fullName || u.name || 'User',
          email: u.email.toLowerCase(),
          password: u.password || '123456',
          companyId: u.companyId ? u.companyId.toString() : null,
          phoneNumber: u.phone || null,
          isActive: u.isActive !== undefined ? u.isActive : true
        }
      });
    }

    // 4. Migrate Projects
    const projects = await Project.find({}).lean();
    console.log(`Migrating ${projects.length} Projects...`);
    for (const pr of projects) {
      await prisma.project.upsert({
        where: { id: pr._id.toString() },
        update: { name: pr.name },
        create: {
          id: pr._id.toString(),
          name: pr.name,
          code: pr.code || null,
          companyId: pr.companyId.toString(),
          pmId: pr.pmId ? pr.pmId.toString() : null,
          clientId: pr.clientId ? pr.clientId.toString() : null,
          status: pr.status || 'ACTIVE',
          budget: pr.budget || 0
        }
      });
    }

    console.log('✅ ETL Data Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during ETL Migration:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  migrateData();
}

module.exports = migrateData;
