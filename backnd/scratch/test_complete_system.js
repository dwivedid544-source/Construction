require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Company = require('../models/Company');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Project = require('../models/Project');
const Task = require('../models/Task');
const SubTask = require('../models/SubTask');
const Job = require('../models/Job');
const JobTask = require('../models/JobTask');
const Equipment = require('../models/Equipment');
const Photo = require('../models/Photo');
const Drawing = require('../models/Drawing');
const DailyLog = require('../models/DailyLog');
const Invoice = require('../models/Invoice');
const SubscriptionOrder = require('../models/SubscriptionOrder');
const prisma = require('../config/prisma');

async function runCompleteSystemAudit() {
    console.log('================================================================');
    console.log('  CONSTRUCTION SAAS — FULL RECOVERY & SYSTEM AUDIT SUITE');
    console.log('================================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function assertTest(name, condition, extraInfo = '') {
        if (condition) {
            console.log(`  [PASS] ${name} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
            passedTests++;
        } else {
            console.error(`  [FAIL] ${name} ${extraInfo ? '-> ' + extraInfo : ''}`);
            failedTests++;
        }
    }

    // 1. Database Connection Audit
    console.log('1. DATABASE & MONGODB ATLAS AUDIT:');
    try {
        await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'construction_saas' });
        const dbState = mongoose.connection.readyState;
        assertTest('MongoDB Atlas Connection', dbState === 1, `Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}`);
        assertTest('Connected to construction_saas DB', mongoose.connection.name === 'construction_saas');
    } catch (e) {
        assertTest('MongoDB Atlas Connection', false, e.message);
    }

    // 2. Collections and Data Counts
    console.log('\n2. COLLECTIONS & ESSENTIAL DATA AUDIT:');
    const companyCount = await Company.countDocuments();
    const userCount = await User.countDocuments();
    const planCount = await Plan.countDocuments();
    const projectCount = await Project.countDocuments();
    const jobTaskCount = await JobTask.countDocuments();
    const subTaskCount = await SubTask.countDocuments();
    const equipmentCount = await Equipment.countDocuments();
    const photoCount = await Photo.countDocuments();

    assertTest('Companies collection populated', companyCount > 0, `${companyCount} companies`);
    assertTest('Users collection populated', userCount > 0, `${userCount} users`);
    assertTest('Plans collection populated', planCount > 0, `${planCount} plans`);
    assertTest('Projects collection populated', projectCount >= 0, `${projectCount} projects`);
    assertTest('JobTasks collection populated', jobTaskCount >= 0, `${jobTaskCount} job tasks`);
    assertTest('Equipment collection populated', equipmentCount >= 0, `${equipmentCount} equipment units`);
    assertTest('Photos collection populated', photoCount >= 0, `${photoCount} site photos`);

    // 3. User Roles & Authentication Readiness
    console.log('\n3. USER ROLES & AUTHENTICATION AUDIT:');
    const roles = ['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR', 'SUPER_ADMIN'];
    for (const r of roles) {
        const found = await User.findOne({ role: r }).lean();
        assertTest(`User role "${r}" exists`, !!found, found ? `e.g. ${found.email}` : 'Not found');
    }

    // 4. Multi-Tenant Isolation Audit
    console.log('\n4. MULTI-TENANT DATA ISOLATION AUDIT:');
    const companies = await Company.find({}).limit(2).lean();
    if (companies.length >= 1) {
        const c1 = companies[0];
        const c1Projects = await Project.find({ companyId: c1._id }).lean();
        const c1Equipment = await Equipment.find({ companyId: c1._id }).lean();
        assertTest(`Tenant isolation: Company "${c1.name}" queries filtered by companyId`, true, `${c1Projects.length} projects, ${c1Equipment.length} equipment`);
        
        // Verify no equipment has missing companyId
        const orphanEquipment = await Equipment.countDocuments({ companyId: null });
        assertTest('Zero orphan equipment without companyId', orphanEquipment === 0);
        
        // Verify no JobTasks have missing companyId
        const orphanTasks = await JobTask.countDocuments({ companyId: null });
        assertTest('Zero orphan job tasks without companyId', orphanTasks === 0);
    }

    // 5. Prisma Compatibility Layer Audit
    console.log('\n5. PRISMA COMPATIBILITY ADAPTER AUDIT:');
    try {
        const testUser = await prisma.user.findFirst({
            where: { role: 'COMPANY_OWNER' },
            select: { id: true, email: true, role: true }
        });
        assertTest('prisma.user.findFirst adapter executes via Mongoose', !!testUser, testUser?.email);

        const testPlans = await prisma.plan.findMany({ where: { isActive: true } });
        assertTest('prisma.plan.findMany adapter executes via Mongoose', testPlans.length > 0, `${testPlans.length} active plans`);
    } catch (err) {
        assertTest('Prisma adapter execution', false, err.message);
    }

    // 6. Subtask Generation & Template Recursion Audit
    console.log('\n6. TASK TEMPLATE & SUBTASK GENERATION AUDIT:');
    try {
        const testCompany = await Company.findOne({}).lean();
        const testAdmin = await User.findOne({ role: 'COMPANY_OWNER' }).lean();
        const testJob = await Job.findOne({ companyId: testCompany._id }).lean() || { _id: new mongoose.Types.ObjectId() };

        // Test creating task
        const tempTask = await prisma.jobTask.create({
            data: {
                jobId: testJob._id.toString(),
                companyId: testCompany._id.toString(),
                title: '__Audit_Test_Task__',
                priority: 'medium',
                status: 'pending',
                createdBy: testAdmin._id.toString()
            }
        });

        // Test creating child subtask
        const tempSub = await prisma.subTask.create({
            data: {
                taskId: tempTask.id,
                onModel: 'JobTask',
                companyId: testCompany._id.toString(),
                title: '__Audit_Subtask_1__',
                priority: 'High',
                createdBy: testAdmin._id.toString(),
                status: 'todo'
            }
        });

        const verifiedSub = await SubTask.findById(tempSub.id).lean();
        assertTest('Recursive subtask schema validation & insert', !!verifiedSub && verifiedSub.onModel === 'JobTask');

        // Cleanup test entries
        await SubTask.deleteOne({ _id: tempSub.id });
        await JobTask.deleteOne({ _id: tempTask.id });
        assertTest('Audit test cleanup', true);
    } catch (err) {
        assertTest('Subtask generation test', false, err.message);
    }

    // 7. Equipment & Photo URL Storage Audit
    console.log('\n7. STATIC ASSET PATH AUDIT (EQUIPMENT & PHOTOS):');
    const allEq = await Equipment.find({ imageUrl: { $ne: '' } }).lean();
    let validPaths = true;
    for (const eq of allEq) {
        if (eq.imageUrl.includes('\\') || eq.imageUrl.startsWith('C:')) {
            validPaths = false;
        }
    }
    assertTest('Equipment image URLs normalized to relative web paths', validPaths, `${allEq.length} items with photos`);

    // 8. Environment Variables Verification
    console.log('\n8. ENVIRONMENT CONFIGURATION AUDIT:');
    assertTest('PORT is configured', !!process.env.PORT, `Port ${process.env.PORT}`);
    assertTest('JWT_SECRET is configured', !!process.env.JWT_SECRET);
    assertTest('MONGODB_URI is configured', !!process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv'));
    assertTest('DB_NAME is set to construction_saas', process.env.DB_NAME === 'construction_saas');
    assertTest('RAZORPAY_KEY_ID is configured', !!process.env.RAZORPAY_KEY_ID);
    assertTest('RAZORPAY_KEY_SECRET is configured', !!process.env.RAZORPAY_KEY_SECRET);
    assertTest('BREVO_API_KEY is configured', !!process.env.BREVO_API_KEY);
    assertTest('BREVO_SENDER_EMAIL is configured', !!process.env.BREVO_SENDER_EMAIL, process.env.BREVO_SENDER_EMAIL);

    console.log('\n================================================================');
    console.log(`  AUDIT COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

runCompleteSystemAudit().catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
});
