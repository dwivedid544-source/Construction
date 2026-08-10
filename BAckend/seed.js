/**
 * seed.js — Seeding script for PostgreSQL database via Prisma Client.
 */

'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./config/prisma');

async function main() {
  console.log('[Seed] Starting PostgreSQL database seeding via Prisma...');

  // 1. Seed Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'System Administrator with full access' },
    { name: 'COMPANY_OWNER', description: 'Business Owner with complete company management' },
    { name: 'PM', description: 'Project Manager managing projects, schedules and teams' },
    { name: 'FOREMAN', description: 'Site Foreman overseeing site ops and daily logs' },
    { name: 'WORKER', description: 'Field Worker completing assigned tasks and time logging' },
    { name: 'ENGINEER', description: 'Site Engineer handling drawings, RFIs and technical specs' },
    { name: 'CLIENT', description: 'Client viewing project progress, photos, and invoices' },
    { name: 'SUBCONTRACTOR', description: 'Subcontractor handling trade bids, RFIs and assigned tasks' },
  ];

  const roleMap = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      create: r,
      update: { description: r.description },
    });
    roleMap[r.name] = role;
  }
  console.log(`[Seed] Seeded ${Object.keys(roleMap).length} roles.`);

  // 2. Seed Plans
  const plansData = [
    { name: 'Free Try Now 7 Days', price: 0, period: '7 Days', maxUsers: 5, maxProjects: 2, isPopular: false, features: ['7 Days full feature trial access', 'Duration: 7 Days'] },
    { name: 'Starter 599', price: 599, period: 'month', maxUsers: 15, maxProjects: 5, isPopular: false, features: ['Essential construction management features', 'Duration: Monthly'] },
    { name: 'Standard 799', price: 799, period: 'month', maxUsers: 30, maxProjects: 15, isPopular: true, features: ['Complete features for growing teams', 'Duration: Monthly'] },
    { name: 'Pro 1299', price: 1299, period: 'month', maxUsers: 100, maxProjects: 50, isPopular: false, features: ['Advanced features and priority support', 'Duration: Monthly'] },
  ];

  let defaultPlan = null;
  const allowedPlanNames = plansData.map(p => p.name);
  
  for (const p of plansData) {
    const plan = await prisma.plan.upsert({
      where: { name: p.name },
      create: p,
      update: { price: p.price, period: p.period, maxUsers: p.maxUsers, maxProjects: p.maxProjects, isPopular: p.isPopular, features: p.features },
    });
    if (p.name === 'Standard 799') defaultPlan = plan;
  }

  // Delete legacy/extra plans not present on landing page
  await prisma.plan.deleteMany({
    where: { name: { notIn: allowedPlanNames } }
  });

  console.log('[Seed] Seeded landing page subscription plans.');

  // 3. Seed Primary Company
  const company = await prisma.company.upsert({
    where: { name: 'KT Construct' },
    create: {
      name: 'KT Construct',
      email: 'admin@kiaan.com',
      phone: '+91 9752100980',
      address: 'KT Construct HQ',
      subscriptionPlanId: defaultPlan?.id,
      subscriptionStatus: 'active',
      maxProjects: 50,
      maxUsers: 100,
    },
    update: {
      subscriptionStatus: 'active',
    },
  });
  console.log(`[Seed] Seeded primary company: ${company.name}`);

  // 4. Seed Demo Users (Supports both @gmail.com and @kaal.ca/@admin.com formats)
  const hashedPassword = await bcrypt.hash('123456', 10);

  const usersData = [
    // Frontend demo card emails (@gmail.com)
    { name: 'Super Admin', email: 'superadmin@gmail.com', role: 'SUPER_ADMIN', roleId: roleMap['SUPER_ADMIN'].id, companyId: company.id },
    { name: 'Company Owner', email: 'admin@gmail.com', role: 'COMPANY_OWNER', roleId: roleMap['COMPANY_OWNER'].id, companyId: company.id },
    { name: 'Project Manager', email: 'pm@gmail.com', role: 'PM', roleId: roleMap['PM'].id, companyId: company.id },
    { name: 'Site Foreman', email: 'foreman@gmail.com', role: 'FOREMAN', roleId: roleMap['FOREMAN'].id, companyId: company.id },
    { name: 'Construction Worker', email: 'worker@gmail.com', role: 'WORKER', roleId: roleMap['WORKER'].id, companyId: company.id },
    { name: 'Site Engineer', email: 'engineer@gmail.com', role: 'ENGINEER', roleId: roleMap['ENGINEER'].id, companyId: company.id },
    { name: 'Valued Client', email: 'client@gmail.com', role: 'CLIENT', roleId: roleMap['CLIENT'].id, companyId: company.id },
    { name: 'Sub Contractor', email: 'subcontractor@gmail.com', role: 'SUBCONTRACTOR', roleId: roleMap['SUBCONTRACTOR'].id, companyId: company.id },
    { name: 'Trade Contractor', email: 'contractor@gmail.com', role: 'SUBCONTRACTOR', roleId: roleMap['SUBCONTRACTOR'].id, companyId: company.id },

    // Alternative domain formats
    { name: 'Super Admin Alt', email: 'super@admin.com', role: 'SUPER_ADMIN', roleId: roleMap['SUPER_ADMIN'].id, companyId: company.id },
    { name: 'Company Owner Alt', email: 'company@admin.com', role: 'COMPANY_OWNER', roleId: roleMap['COMPANY_OWNER'].id, companyId: company.id },
    { name: 'PM Alt', email: 'pm@kaal.ca', role: 'PM', roleId: roleMap['PM'].id, companyId: company.id },
    { name: 'Foreman Alt', email: 'foreman@kaal.ca', role: 'FOREMAN', roleId: roleMap['FOREMAN'].id, companyId: company.id },
    { name: 'Worker Alt', email: 'worker@kaal.ca', role: 'WORKER', roleId: roleMap['WORKER'].id, companyId: company.id },
    { name: 'Engineer Alt', email: 'engineer@kaal.ca', role: 'ENGINEER', roleId: roleMap['ENGINEER'].id, companyId: company.id },
    { name: 'Client Alt', email: 'client@kaal.ca', role: 'CLIENT', roleId: roleMap['CLIENT'].id, companyId: company.id },
    { name: 'Subcontractor Alt', email: 'subcontractor@kaal.ca', role: 'SUBCONTRACTOR', roleId: roleMap['SUBCONTRACTOR'].id, companyId: company.id },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        roleId: u.roleId,
        companyId: u.companyId,
        status: 'ACTIVE',
        isActive: true,
      },
      update: {
        password: hashedPassword,
        roleId: u.roleId,
        companyId: u.companyId,
        isActive: true,
      },
    });
  }

  console.log(`[Seed] Seeded ${usersData.length} demo users successfully with password "123456".`);
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
