const axios = require('axios');

async function testPMProjects() {
    const baseURL = 'http://localhost:4000/api';
    console.log('Testing Projects API for PM vs Admin...');

    try {
        // 1. Admin login
        const adminLogin = await axios.post(`${baseURL}/auth/login`, {
            email: 'company@admin.com',
            password: '123456'
        });
        const adminProjects = await axios.get(`${baseURL}/projects`, {
            headers: { Authorization: `Bearer ${adminLogin.data.token}` }
        });
        console.log(`\nAdmin projects count: ${adminProjects.data?.length}`);
        adminProjects.data.forEach(p => {
            console.log(`  - Project: "${p.name}" (ID: ${p._id || p.id}), PM:`, p.pmId, 'PMs:', p.pmIds);
        });

        // 2. PM login
        const pmLogin = await axios.post(`${baseURL}/auth/login`, {
            email: 'pm@kaal.ca',
            password: '123456'
        });
        console.log('\nPM User Data:', {
            id: pmLogin.data.user?._id || pmLogin.data.user?.id,
            role: pmLogin.data.user?.role,
            companyId: pmLogin.data.user?.companyId,
            permissions: pmLogin.data.user?.permissions
        });

        const pmProjects = await axios.get(`${baseURL}/projects`, {
            headers: { Authorization: `Bearer ${pmLogin.data.token}` }
        });
        console.log(`\nPM projects count: ${pmProjects.data?.length}`);
        pmProjects.data.forEach(p => {
            console.log(`  - Project: "${p.name}" (ID: ${p._id || p.id})`);
        });

    } catch (err) {
        console.error('Error during test:', err.response?.status, err.response?.data || err.message);
    }
}

testPMProjects();
