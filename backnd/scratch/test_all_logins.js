require('dotenv').config();
const connectDB = require('../config/db');

async function testLogins() {
    await connectDB();

    console.log('\n=== TESTING ALL DEMO CREDENTIAL LOGINS ===');
    const demoAccounts = [
        { email: 'super@admin.com', password: 'Password123!' },
        { email: 'superadmin@gmail.com', password: 'Password123!' }, // from screenshot
        { email: 'company@admin.com', password: 'Password123!' },
        { email: 'pm@kaal.ca', password: 'Password123!' },
        { email: 'foreman@kaal.ca', password: 'Password123!' },
        { email: 'worker@kaal.ca', password: 'Password123!' },
        { email: 'engineer@kaal.ca', password: 'Password123!' },
        { email: 'client@kaal.ca', password: 'Password123!' },
        { email: 'subcontractor@kaal.ca', password: 'Password123!' }
    ];

    let ownerToken = null;
    let ownerCompanyId = null;

    for (const acc of demoAccounts) {
        // Try logging in with 123456 or password
        const res = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: acc.email, password: '123456' })
        });
        const data = await res.json();
        if (res.status === 200) {
            console.log(`✅ [${res.status}] ${acc.email} logged in successfully as ${data.role}!`);
            if (data.role === 'COMPANY_OWNER' && !ownerToken) {
                ownerToken = data.token;
                ownerCompanyId = data.companyId;
            }
        } else {
            console.log(`❌ [${res.status}] ${acc.email} failed:`, data.message);
        }
    }

    if (ownerToken) {
        console.log('\n=== TESTING TEAM MEMBER CREATION & LOGIN ===');
        const teamEmail = 'newengineer_' + Date.now().toString().slice(-4) + '@kaal.ca';
        const teamPassword = 'SecurePassword789!';

        console.log('Creating team member:', teamEmail);
        const createRes = await fetch('http://localhost:4000/api/auth/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + ownerToken
            },
            body: JSON.stringify({
                fullName: 'Senior Site Engineer',
                email: teamEmail,
                password: teamPassword,
                role: 'ENGINEER',
                phone: '9876543210'
            })
        });
        const createData = await createRes.json();
        console.log(`Team member creation status: ${createRes.status}`, createData);

        if (createRes.status === 201) {
            console.log('\nAttempting login with new team member credentials...');
            const teamLoginRes = await fetch('http://localhost:4000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: teamEmail,
                    password: teamPassword
                })
            });
            const teamLoginData = await teamLoginRes.json();
            if (teamLoginRes.status === 200) {
                console.log(`🎉 New team member ${teamEmail} logged in successfully! Role: ${teamLoginData.role}, Company: ${teamLoginData.companyId}`);
            } else {
                console.error(`❌ New team member login failed:`, teamLoginData);
            }
        }
    }

    console.log('\n=== COMPLETED ALL TESTS ===');
    process.exit(0);
}

testLogins();
