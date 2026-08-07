/**
 * repositories/index.js — Central repository registry.
 *
 * Every repository is exported here so controllers and services can import
 * from a single location:
 *   const { userRepository, projectRepository } = require('../repositories');
 *
 * DB_DRIVER (process.env) controls which database back-end each repository uses:
 *   'mongoose'  → Mongoose adapter  (default / current)
 *   'prisma'    → Real PrismaClient (PostgreSQL)
 */

'use strict';

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

// ─── Original 5 repositories ─────────────────────────────────────────────────
const userRepository         = require('./userRepository');
const companyRepository      = require('./companyRepository');
const projectRepository      = require('./projectRepository');
const taskRepository         = require('./taskRepository');
const dailyLogRepository     = require('./dailyLogRepository');

// ─── New repositories (Phase 2C) ─────────────────────────────────────────────
const planRepository         = require('./planRepository');
const roleRepository         = require('./roleRepository');
const permissionRepository   = require('./permissionRepository');
const rfiRepository          = require('./rfiRepository');
const issueRepository        = require('./issueRepository');
const photoRepository        = require('./photoRepository');
const drawingRepository      = require('./drawingRepository');
const equipmentRepository    = require('./equipmentRepository');
const invoiceRepository      = require('./invoiceRepository');
const estimateRepository     = require('./estimateRepository');
const payrollRepository      = require('./payrollRepository');
const timeLogRepository      = require('./timeLogRepository');
const vendorRepository       = require('./vendorRepository');
const purchaseOrderRepository = require('./purchaseOrderRepository');
const jobRepository          = require('./jobRepository');
const chatRepository         = require('./chatRepository');
const notificationRepository = require('./notificationRepository');
const auditLogRepository     = require('./auditLogRepository');
const todoRepository         = require('./todoRepository');
const scheduleRepository     = require('./scheduleRepository');
const tradeBidRepository     = require('./tradeBidRepository');
const supportTicketRepository = require('./supportTicketRepository');
const correctionRepository   = require('./correctionRepository');
const taskTemplateRepository = require('./taskTemplateRepository');

module.exports = {
  getDriver,

  // Auth & Tenancy
  userRepository,
  companyRepository,
  planRepository,
  roleRepository,
  permissionRepository,

  // Project Management
  projectRepository,
  taskRepository,
  scheduleRepository,
  taskTemplateRepository,

  // Field Operations
  dailyLogRepository,
  photoRepository,
  drawingRepository,
  rfiRepository,
  issueRepository,
  correctionRepository,

  // Procurement & Assets
  tradeBidRepository,
  vendorRepository,
  purchaseOrderRepository,
  equipmentRepository,

  // Finance & Time Tracking
  invoiceRepository,
  estimateRepository,
  payrollRepository,
  timeLogRepository,

  // Jobs
  jobRepository,

  // Chat & Notifications
  chatRepository,
  notificationRepository,

  // Support & Admin
  supportTicketRepository,
  auditLogRepository,
  todoRepository,
};
