require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const Plan = require('./models/Plan');
const Role = require('./models/Role');
const RolePermission = require('./models/RolePermission');
const connectDB = require('./config/db');

const seedData = async () => {
    try {
        await connectDB();

        console.log('Clearing existing seed data...');
        await User.deleteMany();
        await Company.deleteMany();
        await Plan.deleteMany();
        await Role.deleteMany();
        await RolePermission.deleteMany();

        console.log('Seeding Plans...');
        const plans = await Plan.create([
            {
                name: 'Free Trial',
                tag: 'TEST DRIVE',
                description: 'Experience the full platform core with site logs, sample projects & daily reports to explore KT Construct.',
                price: 0,
                period: '7 days',
                durationStr: '/ 7 days',
                maxProjects: 1,
                maxJobs: 3,
                maxUsers: 3,
                isPopular: false,
                features: [
                    '1 Active Construction Project',
                    '3 Active Job Locations',
                    'Up to 3 Team Members / Staff',
                    'Daily Site Logs & Worker Attendance',
                    'Document & Blueprint Vault (500 MB)',
                    '7-Day Full Platform Access'
                ]
            },
            {
                name: 'Starter Plan',
                tag: 'SMALL TEAM',
                description: 'Perfect for independent contractors, small builders, or specialty trade subcontractors.',
                price: 999,
                period: 'month',
                durationStr: '/ month',
                maxProjects: 3,
                maxJobs: 5,
                maxUsers: 5,
                isPopular: false,
                features: [
                    'Up to 3 Active Construction Projects',
                    'Up to 5 Job Sites & Work Orders',
                    'Up to 5 Team Members & Engineers',
                    'Daily Site Logs & Photo Attachments',
                    'Subcontractor RFQs & Bidding Hub',
                    'Purchase Orders (POs) & Invoicing',
                    'Task Checklists & Worker Time Logs'
                ]
            },
            {
                name: 'Standard Plan',
                tag: 'RECOMMENDED',
                description: 'Best for growing general contractors, commercial builders, and engineering firms.',
                price: 1299,
                period: 'month',
                durationStr: '/ month',
                maxProjects: 10,
                maxJobs: 25,
                maxUsers: 15,
                isPopular: true,
                features: [
                    'Everything in Starter Plan',
                    'Up to 10 Active Construction Projects',
                    'Up to 25 Active Job Locations',
                    'Up to 15 Team Members & Subcontractors',
                    'Interactive Gantt Schedules & Milestones',
                    'GPS Site Clock-in & Crew Geofencing',
                    'Material & Expense Budget Tracking',
                    'Blueprint Center with RFI System (25 GB)'
                ]
            },
            {
                name: 'Pro Plan',
                tag: 'UNCAPPED POWER',
                description: 'For multi-site developers, heavy infra contractors, and construction enterprises.',
                price: 1499,
                period: 'month',
                durationStr: '/ month',
                maxProjects: 50,
                maxJobs: 100,
                maxUsers: 50,
                isPopular: false,
                features: [
                    'Everything in Standard Plan',
                    'Up to 50 Active Projects & 100 Jobs',
                    'Up to 50 Team Members & Field Crews',
                    'AI-Powered Scheduling & Delay Forecasts',
                    'Full Purchase Order & Cost Control ERP',
                    'Export CSV & PDF Financial Audit Reports',
                    'Multi-Site Executive KPI Dashboards',
                    'Priority 24/7 Dedicated Support'
                ]
            },
            {
                name: 'Custom Plan',
                tag: 'CUSTOM',
                description: 'Tailored to your enterprise construction operations & custom workflows.',
                price: 0,
                period: 'custom',
                durationStr: 'Custom',
                maxProjects: 9999,
                maxJobs: 9999,
                maxUsers: 9999,
                isPopular: false,
                features: [
                    'SaaS with Full Customization',
                    'Unlimited Projects, Jobs & Team Members',
                    'Personal Domain & Custom Branding',
                    'Dedicated Account Manager & SLA',
                    'Custom ERP / Accounting Integrations',
                    'On-premise / Hybrid Cloud Deployment'
                ]
            }
        ]);

        const starterPlan = plans[1];

        console.log('Seeding Primary Company...');
        const company = await Company.create({
            name: 'KT Construction Pvt Ltd',
            email: 'info@kiaantechnology.com',
            phone: '9876543210',
            address: '100 Innovation Park, Tech City',
            subscriptionPlanId: starterPlan._id,
            subscriptionStatus: 'active',
            startDate: new Date(),
            expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });

        const companyId = company._id;

        console.log('Seeding Roles...');
        const roleNames = ['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'ENGINEER', 'CLIENT', 'SUBCONTRACTOR'];
        const roleDocs = {};
        for (const rName of roleNames) {
            roleDocs[rName] = await Role.create({
                name: rName,
                description: `${rName} role in construction SaaS`
            });
        }

        console.log('Seeding Users...');
        const users = [
            {
                fullName: 'Super Admin',
                email: 'super@admin.com',
                password: '123456',
                role: 'SUPER_ADMIN',
                roleId: roleDocs['SUPER_ADMIN']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Kiaan Admin',
                email: 'company@admin.com',
                password: '123456',
                role: 'COMPANY_OWNER',
                roleId: roleDocs['COMPANY_OWNER']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Project Manager',
                email: 'pm@kaal.ca',
                password: '123456',
                role: 'PM',
                roleId: roleDocs['PM']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Site Foreman',
                email: 'foreman@kaal.ca',
                password: '123456',
                role: 'FOREMAN',
                roleId: roleDocs['FOREMAN']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Construction Worker',
                email: 'worker@kaal.ca',
                password: '123456',
                role: 'WORKER',
                roleId: roleDocs['WORKER']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Site Engineer',
                email: 'engineer@kaal.ca',
                password: '123456',
                role: 'ENGINEER',
                roleId: roleDocs['ENGINEER']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Valued Client',
                email: 'client@kaal.ca',
                password: '123456',
                role: 'CLIENT',
                roleId: roleDocs['CLIENT']._id,
                companyId,
                isActive: true
            },
            {
                fullName: 'Sub Contractor',
                email: 'subcontractor@kaal.ca',
                password: '123456',
                role: 'SUBCONTRACTOR',
                roleId: roleDocs['SUBCONTRACTOR']._id,
                companyId,
                isActive: true
            }
        ];

        for (const u of users) {
            await User.create(u);
        }

        console.log('\n🎉 Seed Data Created Successfully in MongoDB!');
        console.log('Demo Credentials (all use password: 123456):');
        console.log('- Super Admin:   super@admin.com');
        console.log('- Company Owner: company@admin.com');
        console.log('- Project Mgr:   pm@kaal.ca');
        console.log('- Site Foreman:  foreman@kaal.ca');
        console.log('- Site Engineer: engineer@kaal.ca');
        console.log('- Worker:        worker@kaal.ca');
        console.log('- Client:        client@kaal.ca');
        console.log('- Subcontractor: subcontractor@kaal.ca');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
