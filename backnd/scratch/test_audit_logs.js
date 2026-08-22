const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testAuditLogs() {
    try {
        await connectDB();
        const AuditLog = require('../models/AuditLog');
        const User = require('../models/User');

        const testUser = await User.findOne({ role: 'COMPANY_OWNER' });
        console.log('Found user:', testUser ? testUser.fullName : 'None');

        // 1. Create a simulated User Login audit log
        const successLog = await AuditLog.create({
            userId: testUser?._id,
            userName: testUser?.fullName || 'Admin User',
            userEmail: testUser?.email || 'admin@example.com',
            action: 'User Login',
            module: 'Authentication',
            details: 'User logged in successfully',
            ipAddress: '192.168.1.100',
            timestamp: new Date()
        });
        console.log('Created Success Audit Log:', successLog._id, successLog.action, successLog.details);

        // 2. Create a simulated Failed Login audit log
        const failLog = await AuditLog.create({
            userName: 'hacker@test.com',
            userEmail: 'hacker@test.com',
            action: 'Failed Login',
            module: 'Authentication',
            details: 'Invalid password entered',
            ipAddress: '203.0.113.195',
            timestamp: new Date()
        });
        console.log('Created Failed Audit Log:', failLog._id, failLog.action, failLog.details);

        // 3. Query audit logs as super admin would
        const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent 5 logs:');
        recentLogs.forEach(l => {
            console.log(`- [${l.action}] [${l.module}] ${l.userName || l.userEmail}: ${l.details} (IP: ${l.ipAddress})`);
        });

        // Cleanup test logs
        await AuditLog.deleteOne({ _id: successLog._id });
        await AuditLog.deleteOne({ _id: failLog._id });
        console.log('Cleaned up test logs');

        await mongoose.disconnect();
        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testAuditLogs();
