const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function inspectCompanyUsers() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Company = require('../models/Company');
        const Plan = require('../models/Plan');

        const admin = await User.findOne({ role: 'COMPANY_OWNER' });
        console.log('Admin:', admin.fullName, admin.email, 'CompanyId:', admin.companyId);

        const company = await Company.findById(admin.companyId);
        console.log('Company:', company.name, 'PlanId:', company.subscriptionPlanId);

        const plan = await Plan.findById(company.subscriptionPlanId);
        console.log('Plan:', plan ? plan.name : 'No Plan', 'maxUsers:', plan ? plan.maxUsers : 'N/A');

        const allUsersInCompany = await User.find({ companyId: admin.companyId });
        console.log(`Total users in company (${allUsersInCompany.length}):`);
        allUsersInCompany.forEach((u, i) => {
            console.log(`${i + 1}. [${u.role}] ${u.fullName} (${u.email}) - active: ${u.isActive}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectCompanyUsers();
