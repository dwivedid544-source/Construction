const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'backnd/.env' });

const User = require('../models/User');
const Project = require('../models/Project');
const Company = require('../models/Company');

async function inspectDb() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME || 'construction_saas'
    });
    console.log('Connected to MongoDB');

    const companies = await Company.find({});
    console.log(`\nCompanies (${companies.length}):`);
    companies.forEach(c => console.log(`  - Company: "${c.name}" ID: ${c._id}`));

    const users = await User.find({ role: { $in: ['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'] } });
    console.log(`\nUsers (${users.length}):`);
    users.forEach(u => console.log(`  - User: "${u.fullName}" (${u.email}), Role: ${u.role}, CompanyId: ${u.companyId}, ID: ${u._id}`));

    const projects = await Project.find({});
    console.log(`\nProjects (${projects.length}):`);
    projects.forEach(p => console.log(`  - Project: "${p.name}", Status: ${p.status}, CompanyId: ${p.companyId}, pmId: ${p.pmId}, pmIds: ${p.pmIds}, createdBy: ${p.createdBy}, ID: ${p._id}`));

    process.exit(0);
}

inspectDb();
