/**
 * health.test.js — Automated Health & Integration Verification Test Suite.
 */

'use strict';

const prisma = require('../config/prisma');

async function runTests() {
  console.log('────────────────────────────────────────────────────────');
  console.log('  Kiaan ERP SaaS — Automated Test Suite Execution');
  console.log('────────────────────────────────────────────────────────');

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${name} — ${err.message}`);
      failed++;
    }
  }

  // Test 1: Database Connectivity
  await assertTest('Prisma PostgreSQL Database Connection', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    if (!result || result.length === 0) throw new Error('Database ping returned empty');
  });

  // Test 2: Repository Factory Loading
  await assertTest('Central Repository Factory Registry', async () => {
    const repos = require('../repositories');
    if (!repos.userRepository || !repos.companyRepository || !repos.projectRepository) {
      throw new Error('Repositories failed to export core models');
    }
  });

  // Test 3: Utility Modules Loading
  await assertTest('Utility Layer Modules', async () => {
    require('../utils/AppError');
    require('../utils/logger');
    require('../utils/pagination');
    require('../utils/search');
    require('../utils/auditLog');
    require('../utils/asyncHandler');
  });

  // Test 4: Rate Limiter Middleware
  await assertTest('Rate Limiter Creation', async () => {
    const { createRateLimiter } = require('../middlewares/rateLimiter');
    const limiter = createRateLimiter({ windowMs: 1000, max: 5 });
    if (typeof limiter !== 'function') throw new Error('Rate limiter is not a function');
  });

  // Test 5: Services Layer Loading
  await assertTest('Service Layer Business Modules', async () => {
    require('../services/authService');
    require('../services/userService');
    require('../services/projectService');
    require('../services/taskService');
    require('../services/companyService');
    require('../services/jobService');
    require('../services/billingService');
    require('../services/analyticsService');
    require('../services/superAdminService');
  });

  console.log('────────────────────────────────────────────────────────');
  console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('────────────────────────────────────────────────────────');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
