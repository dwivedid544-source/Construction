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
    {
      name: 'Free Try Now 7 Days',
      price: 0,
      period: '7 Days',
      maxUsers: 3,
      maxProjects: 1,
      isPopular: false,
      features: [
        "1 Active Construction Project",
        "3 Team Members / Field Engineers",
        "Daily Site Logs & Task Management",
        "Basic Subcontractor RFQ Requests",
        "Purchase Orders & Invoice Creation",
        "Document & Blueprint Vault (500 MB)",
        "Full 7-Day Unrestricted Access"
      ]
    },
    {
      name: 'Starter 1',
      price: 1,
      period: 'month',
      maxUsers: 10,
      maxProjects: 3,
      isPopular: false,
      features: [
        "Up to 3 Active Construction Projects",
        "Up to 10 Team Members & Engineers",
        "Daily Site Logs & Worker Attendance",
        "Subcontractor Bidding & RFQ Hub",
        "Purchase Order (PO) & Invoice System",
        "Site Daily Logs & Photo Attachments",
        "RFI & Blueprint Document Vault (5 GB)",
        "Basic Cost Control & Expense Tracking"
      ]
    },
    {
      name: 'Standard 799',
      price: 799,
      period: 'month',
      maxUsers: 25,
      maxProjects: 10,
      isPopular: true,
      features: [
        "Up to 10 Active Construction Projects",
        "Up to 25 Team Members & Subcontractors",
        "Advanced Subcontractor & Field Tracking",
        "Real-time Site & Workforce Analytics",
        "GPS Crew Clock-in & Site Geofencing",
        "Full PO Approval & Invoice Workflows",
        "Gantt Schedules & Milestone Tracking",
        "Blueprint Center with RFI System (25 GB)",
        "Automated Budget Overrun Alerts"
      ]
    },
    {
      name: 'Pro 1299',
      price: 1299,
      period: 'month',
      maxUsers: 999,
      maxProjects: 999,
      isPopular: false,
      features: [
        "Unlimited Active Construction Projects",
        "Unlimited Team Members & Subcontractors",
        "Complete Enterprise Construction Suite",
        "AI-Powered Scheduling & Delay Forecasts",
        "Live GPS Site Monitoring & Asset Tracking",
        "Advanced Financial Controls & Audit Logs",
        "Multi-Site Executive Dashboards & Analytics",
        "Unlimited CAD Blueprints & RFI Vault",
        "24/7 Dedicated Support & Account Manager"
      ]
    },
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

  // 5. Seed Demo Projects & Tasks
  const pmUser = await prisma.user.findUnique({ where: { email: 'pm@gmail.com' } });
  const clientUser = await prisma.user.findUnique({ where: { email: 'client@gmail.com' } });
  const workerUser = await prisma.user.findUnique({ where: { email: 'worker@gmail.com' } });

  const projectsData = [
    {
      name: 'Skyline Commercial Complex',
      code: 'PRJ-001',
      description: 'Multi-story commercial office building with subterranean parking',
      companyId: company.id,
      pmId: pmUser?.id || null,
      clientId: clientUser?.id || null,
      status: 'ACTIVE',
      budget: 1500000,
      location: '123 Construction Way, New York, NY',
    },
    {
      name: 'Metro Residential Towers',
      code: 'PRJ-002',
      description: 'Luxury twin residential towers with modern amenities',
      companyId: company.id,
      pmId: pmUser?.id || null,
      clientId: clientUser?.id || null,
      status: 'ACTIVE',
      budget: 2800000,
      location: '456 Metro Ave, Chicago, IL',
    },
    {
      name: 'Harbor View Plaza',
      code: 'PRJ-003',
      description: 'Waterfront commercial retail & dining complex',
      companyId: company.id,
      pmId: pmUser?.id || null,
      clientId: clientUser?.id || null,
      status: 'PLANNING',
      budget: 950000,
      location: '789 Ocean Blvd, Miami, FL',
    },
  ];

  const projectMap = {};
  for (const p of projectsData) {
    const existingProject = await prisma.project.findFirst({
      where: { companyId: p.companyId, name: p.name, deletedAt: null }
    });

    let project;
    if (existingProject) {
      project = await prisma.project.update({
        where: { id: existingProject.id },
        data: p,
      });
    } else {
      project = await prisma.project.create({
        data: p,
      });
    }
    projectMap[p.code] = project;
  }
  console.log(`[Seed] Seeded ${Object.keys(projectMap).length} demo projects.`);

  // 6. Seed Demo Tasks
  if (projectMap['PRJ-001']) {
    const prj1 = projectMap['PRJ-001'];
    const tasksData = [
      {
        title: 'Site Excavation & Foundation',
        description: 'Deep excavation, shoring, and concrete foundation pour',
        projectId: prj1.id,
        companyId: company.id,
        assignedToId: workerUser?.id || null,
        createdById: pmUser?.id || null,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 120,
      },
      {
        title: 'Structural Steel Framing',
        description: 'Erection of structural steel beams and columns',
        projectId: prj1.id,
        companyId: company.id,
        assignedToId: workerUser?.id || null,
        createdById: pmUser?.id || null,
        status: 'PENDING',
        priority: 'MEDIUM',
        estimatedHours: 80,
      },
    ];

    for (const t of tasksData) {
      const existingTask = await prisma.task.findFirst({
        where: { projectId: t.projectId, title: t.title, deletedAt: null }
      });
      if (!existingTask) {
        await prisma.task.create({ data: t });
      }
    }
    console.log(`[Seed] Seeded demo tasks for ${prj1.name}.`);
  }
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
