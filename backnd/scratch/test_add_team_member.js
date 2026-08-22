const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testUserLimit() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Company = require('../models/Company');
        const Plan = require('../models/Plan');

        const admin = await User.findOne({ role: 'COMPANY_OWNER' });
        console.log('Company Admin:', admin.fullName, admin.email, 'CompanyId:', admin.companyId);

        const company = await Company.findById(admin.companyId);
        const plan = await Plan.findById(company.subscriptionPlanId);

        const teamMemberCount = await User.countDocuments({
            companyId: admin.companyId,
            role: { $in: ['PM', 'FOREMAN', 'ENGINEER', 'WORKER', 'SUBCONTRACTOR'] }
        });

        console.log(`Plan: ${plan.name}, Max Team Members: ${plan.maxUsers}, Current Team Members: ${teamMemberCount}`);

        // Try creating test member
        const testMember = await User.create({
            companyId: admin.companyId,
            fullName: 'Naman Dheer',
            email: `naman_test_${Date.now()}@gmail.com`,
            password: 'testpassword123',
            role: 'ENGINEER',
            phone: '6543120865',
            hourlyRate: 15,
            isActive: true
        });

        console.log('Successfully created team member:', testMember.fullName, testMember.email, testMember.role);

        // Clean up test member
        await User.deleteOne({ _id: testMember._id });
        console.log('Cleaned up test member');

        await mongoose.disconnect();
        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testUserLimit();
