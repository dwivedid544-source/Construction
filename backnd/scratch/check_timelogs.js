const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'backnd/.env' });

const User = require('../models/User');
const TimeLog = require('../models/TimeLog');
const prisma = require('../config/prisma');

async function checkTimeLogs() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME || 'construction_saas'
    });
    console.log('Connected to MongoDB');

    // 1. Fetch all users
    const users = await User.find({});
    console.log(`\nUsers (${users.length}):`);
    users.forEach(u => console.log(`  - User: ${u.fullName} (${u.email}) [ID: ${u._id}, Role: ${u.role}]`));

    // 2. Fetch all timelogs
    const logs = await TimeLog.find({}).sort({ createdAt: -1 });
    console.log(`\nTimeLogs in DB (${logs.length}):`);
    logs.forEach(l => {
        console.log(`  - Log ID: ${l._id}, User: ${l.userId}, ClockIn: ${l.clockIn}, ClockOut: ${l.clockOut}, Project: ${l.projectId}, Job: ${l.jobId}`);
    });

    // 3. Test findFirst through prisma adapter
    for (const u of users) {
        const activePrisma = await prisma.timeLog.findFirst({
            where: { userId: u._id.toString(), clockOut: null }
        });
        const activePrismaObjId = await prisma.timeLog.findFirst({
            where: { userId: u._id, clockOut: null }
        });
        console.log(`User "${u.fullName}" (${u.email}): Active log string: ${!!activePrisma}, Active log ObjectId: ${!!activePrismaObjId}`);
        if (activePrisma) {
            console.log('   Log details:', activePrisma);
        }
    }

    process.exit(0);
}

checkTimeLogs();
