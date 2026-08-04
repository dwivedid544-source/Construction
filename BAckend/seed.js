require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Company = require('./models/Company');
const Plan = require('./models/Plan');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const RolePermission = require('./models/RolePermission');

const seedData = async () => {
    try {
        await connectDB();
        console.log('Clearing existing seed data...');

        await User.deleteMany({});
        await Company.deleteMany({});
        await Plan.deleteMany({});
        await Role.deleteMany({});
        await Permission.deleteMany({});
        await RolePermission.deleteMany({});

        console.log('Data cleared.');

        // 1. Seed Plans
        const plans = await Plan.create([
            {
                name: 'SILVER',
                price: 99,
                period: 'month',
                maxUsers: 10,
                maxProjects: 5,
                features: ['VIEW_PROJECTS', 'VIEW_TASKS', 'ACCESS_CHAT']
            },
            {
                name: 'GOLD',
                price: 249,
                period: 'month',
                maxUsers: 25,
                maxProjects: 15,
                features: ['VIEW_PROJECTS', 'VIEW_TASKS', 'VIEW_FINANCIALS', 'ACCESS_CHAT', 'CLOCK_IN_OUT']
            },
            {
                name: 'ENTERPRISE',
                price: 499,
                period: 'month',
                maxUsers: 100,
                maxProjects: 50,
                isPopular: true,
                features: ['ALL']
            }
        ]);
        console.log(`Seeded ${plans.length} subscription plans.`);

        const enterprisePlan = plans.find(p => p.name === 'ENTERPRISE');

        // 2. Seed Company
        const company = await Company.create({
            name: 'Kaal Construction Ltd',
            email: 'admin@kaal.ca',
            phone: '+1 (555) 019-2834',
            address: '100 Construction Way, Toronto, ON',
            subscriptionPlanId: enterprisePlan._id,
            subscriptionStatus: 'active',
            planType: 'Yearly',
            startDate: new Date(),
            expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        console.log(`Seeded primary company: ${company.name} (${company._id})`);

        // 3. Seed Roles
        const rolesData = [
            { name: 'SUPER_ADMIN', description: 'System Administrator with full access' },
            { name: 'COMPANY_OWNER', description: 'Business Owner with complete company management' },
            { name: 'PM', description: 'Project Manager managing projects, schedules and teams' },
            { name: 'FOREMAN', description: 'Site Foreman overseeing site ops and daily logs' },
            { name: 'WORKER', description: 'Field Worker completing assigned tasks and time logging' },
            { name: 'ENGINEER', description: 'Site Engineer handling drawings, RFIs and technical specs' },
            { name: 'CLIENT', description: 'Client viewing project progress, photos, and invoices' },
            { name: 'SUBCONTRACTOR', description: 'Subcontractor handling trade bids, RFIs and assigned tasks' }
        ];

        const createdRoles = {};
        for (const roleDef of rolesData) {
            const roleObj = await Role.create(roleDef);
            createdRoles[roleDef.name] = roleObj;
        }
        console.log(`Seeded ${Object.keys(createdRoles).length} roles.`);

        // 4. Seed Permissions
        const permissionsData = [
            { key: 'ALL', module: 'OTHER', description: 'Full system authorization' },
            { key: 'VIEW_DASHBOARD', module: 'OTHER', description: 'Can view dashboard' },
            { key: 'VIEW_TEAM', module: 'USER', description: 'Can view team list' },
            { key: 'MANAGE_TEAM', module: 'USER', description: 'Can create and manage users' },
            { key: 'VIEW_PROJECTS', module: 'PROJECT', description: 'Can view projects' },
            { key: 'MANAGE_PROJECTS', module: 'PROJECT', description: 'Can manage projects' },
            { key: 'VIEW_TASKS', module: 'TASK', description: 'Can view tasks' },
            { key: 'VIEW_MY_TASKS', module: 'TASK', description: 'Can view assigned tasks' },
            { key: 'MANAGE_TASKS', module: 'TASK', description: 'Can manage tasks' },
            { key: 'CLOCK_IN_OUT', module: 'OTHER', description: 'Can clock in and out' },
            { key: 'CLOCK_IN_CREW', module: 'OTHER', description: 'Can clock in crew members' },
            { key: 'VIEW_FINANCIALS', module: 'FINANCIAL', description: 'Can view financial data' },
            { key: 'MANAGE_FINANCIALS', module: 'FINANCIAL', description: 'Can manage financial data' },
            { key: 'VIEW_INVOICES', module: 'FINANCIAL', description: 'Can view invoices' },
            { key: 'VIEW_PO', module: 'PO', description: 'Can view purchase orders' },
            { key: 'VIEW_REPORTS', module: 'OTHER', description: 'Can view reports' },
            { key: 'ACCESS_CHAT', module: 'CHAT', description: 'Can access chat' },
            { key: 'VIEW_PHOTOS', module: 'PROJECT', description: 'Can view project photos' },
            { key: 'MANAGE_DRAWINGS', module: 'PROJECT', description: 'Can manage project drawings' },
            { key: 'VIEW_DRAWINGS', module: 'PROJECT', description: 'Can view project drawings' },
            { key: 'MANAGE_DAILY_LOGS', module: 'PROJECT', description: 'Can create and edit daily logs' },
            { key: 'VIEW_RFI', module: 'RFI', description: 'Can view RFIs' },
            { key: 'VIEW_EQUIPMENT', module: 'EQUIPMENT', description: 'Can view equipment' }
        ];

        const createdPermissions = {};
        for (const permDef of permissionsData) {
            const permObj = await Permission.create(permDef);
            createdPermissions[permDef.key] = permObj;
        }
        console.log(`Seeded ${Object.keys(createdPermissions).length} permissions.`);

        // 5. Seed Role Permissions Mapping
        const rolePermMappings = {
            'SUPER_ADMIN': Object.keys(createdPermissions),
            'COMPANY_OWNER': ['VIEW_DASHBOARD', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_PROJECTS', 'MANAGE_PROJECTS', 'VIEW_TASKS', 'MANAGE_TASKS', 'VIEW_FINANCIALS', 'MANAGE_FINANCIALS', 'VIEW_INVOICES', 'VIEW_REPORTS', 'ACCESS_CHAT', 'CLOCK_IN_OUT'],
            'PM': ['VIEW_DASHBOARD', 'VIEW_TEAM', 'MANAGE_TEAM', 'VIEW_PROJECTS', 'MANAGE_PROJECTS', 'VIEW_TASKS', 'MANAGE_TASKS', 'VIEW_FINANCIALS', 'VIEW_REPORTS', 'ACCESS_CHAT', 'CLOCK_IN_OUT', 'MANAGE_DRAWINGS', 'VIEW_RFI', 'VIEW_EQUIPMENT'],
            'FOREMAN': ['VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_TASKS', 'MANAGE_TASKS', 'VIEW_REPORTS', 'ACCESS_CHAT', 'CLOCK_IN_OUT', 'CLOCK_IN_CREW', 'MANAGE_DAILY_LOGS', 'VIEW_PHOTOS', 'VIEW_DRAWINGS'],
            'WORKER': ['VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_MY_TASKS', 'ACCESS_CHAT', 'CLOCK_IN_OUT', 'VIEW_PHOTOS'],
            'ENGINEER': ['VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_TASKS', 'MANAGE_DRAWINGS', 'VIEW_DRAWINGS', 'VIEW_RFI', 'ACCESS_CHAT'],
            'CLIENT': ['VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_PHOTOS', 'VIEW_INVOICES', 'ACCESS_CHAT'],
            'SUBCONTRACTOR': ['VIEW_DASHBOARD', 'VIEW_PROJECTS', 'VIEW_TASKS', 'VIEW_RFI', 'ACCESS_CHAT', 'CLOCK_IN_OUT']
        };

        const rolePermissionDocs = [];
        for (const [roleName, permKeys] of Object.entries(rolePermMappings)) {
            const roleObj = createdRoles[roleName];
            if (!roleObj) continue;
            for (const pKey of permKeys) {
                const permObj = createdPermissions[pKey];
                if (permObj) {
                    rolePermissionDocs.push({
                        roleId: roleObj._id,
                        permissionId: permObj._id
                    });
                }
            }
        }

        await RolePermission.create(rolePermissionDocs);
        console.log(`Seeded ${rolePermissionDocs.length} role-permission links.`);

        // 6. Seed Users
        const usersData = [
            {
                fullName: 'Super Admin',
                email: 'super@admin.com',
                password: '123456',
                role: 'SUPER_ADMIN',
                roleId: createdRoles['SUPER_ADMIN']._id,
                companyId: company._id
            },
            {
                fullName: 'John Owner',
                email: 'company@admin.com',
                password: '123456',
                role: 'COMPANY_OWNER',
                roleId: createdRoles['COMPANY_OWNER']._id,
                companyId: company._id
            },
            {
                fullName: 'Project Manager',
                email: 'pm@kaal.ca',
                password: '123456',
                role: 'PM',
                roleId: createdRoles['PM']._id,
                companyId: company._id
            },
            {
                fullName: 'Site Foreman',
                email: 'foreman@kaal.ca',
                password: '123456',
                role: 'FOREMAN',
                roleId: createdRoles['FOREMAN']._id,
                companyId: company._id
            },
            {
                fullName: 'Construction Worker',
                email: 'worker@kaal.ca',
                password: '123456',
                role: 'WORKER',
                roleId: createdRoles['WORKER']._id,
                companyId: company._id
            },
            {
                fullName: 'Site Engineer',
                email: 'engineer@kaal.ca',
                password: '123456',
                role: 'ENGINEER',
                roleId: createdRoles['ENGINEER']._id,
                companyId: company._id
            },
            {
                fullName: 'Valued Client',
                email: 'client@kaal.ca',
                password: '123456',
                role: 'CLIENT',
                roleId: createdRoles['CLIENT']._id,
                companyId: company._id
            },
            {
                fullName: 'Sub Contractor',
                email: 'subcontractor@kaal.ca',
                password: '123456',
                role: 'SUBCONTRACTOR',
                roleId: createdRoles['SUBCONTRACTOR']._id,
                companyId: company._id
            }
        ];

        // Seed users one by one to properly trigger bcrypt pre-save middleware
        for (const userDef of usersData) {
            await User.create(userDef);
        }
        console.log(`Seeded ${usersData.length} users successfully!`);

        console.log('All Seed Data successfully created!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
