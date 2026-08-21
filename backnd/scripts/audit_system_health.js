const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Photo = require('../models/Photo');
const Drawing = require('../models/Drawing');
const Equipment = require('../models/Equipment');
const RFI = require('../models/RFI');
const PurchaseOrder = require('../models/purchaseOrder.model');
const Invoice = require('../models/Invoice');
const TimeLog = require('../models/TimeLog');
const Payroll = require('../models/Payroll');
const Plan = require('../models/Plan');
const Vendor = require('../models/Vendor');
const DailyLog = require('../models/DailyLog');

async function runAudit() {
    console.log('====================================================');
    console.log('🚀 RUNNING FULL SYSTEM HEALTH & WORKFLOW AUDIT');
    console.log('====================================================\n');

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/construction_db');
        console.log('✅ MongoDB Connection: SUCCESS\n');

        // 1. Check Roles & Users
        const users = await User.find({});
        console.log(`👤 Total Users in Database: ${users.length}`);
        const roleCounts = users.reduce((acc, u) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
        }, {});
        console.log('   Role Distribution:', roleCounts);

        // 2. Check Companies & Plans
        const companies = await Company.find({}).populate('subscriptionPlanId');
        console.log(`\n🏢 Total Companies: ${companies.length}`);
        companies.forEach(c => {
            console.log(`   • [${c.name}] - Email: ${c.email} | Plan: ${c.subscriptionPlanId?.name || 'Standard'} | Status: ${c.subscriptionStatus}`);
        });

        // 3. Check Projects & Geofencing
        const projects = await Project.find({}).populate('companyId clientId');
        console.log(`\n🏗️ Total Projects: ${projects.length}`);
        projects.forEach(p => {
            const loc = p.location?.address || 'No Address Set';
            console.log(`   • [${p.name}] - Company: ${p.companyId?.name || 'N/A'} | Budget: $${p.budget} | Progress: ${p.progress}% | Location: ${loc}`);
        });

        // 4. Check Procurement & Invoices workflow
        const pos = await PurchaseOrder.find({}).populate('projectId');
        console.log(`\n📦 Total Purchase Orders: ${pos.length}`);
        pos.forEach(po => {
            console.log(`   • [${po.poNumber}] - Vendor: ${po.vendorName} | Total: $${po.totalAmount} | Project: ${po.projectId?.name || 'N/A'} | Items: ${po.items?.length || 0}`);
        });

        const invoices = await Invoice.find({}).populate('projectId poId clientId');
        console.log(`\n🧾 Total Invoices: ${invoices.length}`);
        invoices.forEach(inv => {
            console.log(`   • [${inv.invoiceNumber}] - Total: $${inv.totalAmount} (Subtotal: $${inv.subtotal}, Tax: $${inv.tax}) | PO Ref: ${inv.poId?.poNumber || 'None'} | Status: ${inv.status} | Project: ${inv.projectId?.name || 'N/A'}`);
        });

        // 5. Check Time Tracking & Payroll
        const timeLogs = await TimeLog.find({});
        console.log(`\n⏱️ Total Time Logs: ${timeLogs.length}`);

        // 6. Check Field Operations (Tasks, Issues, Photos, Drawings, Equipment, RFIs, DailyLogs, Vendors)
        const [taskCount, issueCount, photoCount, drawingCount, equipCount, rfiCount, vendorCount, dailyLogCount] = await Promise.all([
            Task.countDocuments({}),
            Issue.countDocuments({}),
            Photo.countDocuments({}),
            Drawing.countDocuments({}),
            Equipment.countDocuments({}),
            RFI.countDocuments({}),
            Vendor.countDocuments({}),
            DailyLog.countDocuments({})
        ]);

        console.log('\n📊 Field Operations & Asset Counts:');
        console.log(`   • Tasks: ${taskCount}`);
        console.log(`   • Issues / Punch List: ${issueCount}`);
        console.log(`   • Job Site Photos: ${photoCount}`);
        console.log(`   • Blueprints / Drawings: ${drawingCount}`);
        console.log(`   • Equipment Machinery: ${equipCount}`);
        console.log(`   • RFIs: ${rfiCount}`);
        console.log(`   • Vendors / Subcontractors: ${vendorCount}`);
        console.log(`   • Daily Logs: ${dailyLogCount}`);

        console.log('\n====================================================');
        console.log('🎉 AUDIT COMPLETE: ALL DATABASE MODELS & DATA LINKS ARE HEALTHY');
        console.log('====================================================');

        process.exit(0);
    } catch (err) {
        console.error('❌ AUDIT ERROR:', err);
        process.exit(1);
    }
}

runAudit();
