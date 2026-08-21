const axios = require('axios');

async function testBothPMs() {
    const baseURL = 'http://localhost:4000/api';
    console.log('Testing Both PMs...');

    const pms = [
        { email: 'pm@kaal.ca', password: '123456' },
        { email: 'pm@gmail.com', password: '123456' },
        { email: 'admin@gmail.com', password: '123456' }
    ];

    for (const pm of pms) {
        try {
            const login = await axios.post(`${baseURL}/auth/login`, pm);
            const token = login.data.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const projectsRes = await axios.get(`${baseURL}/projects`, config);
            const jobsRes = await axios.get(`${baseURL}/jobs`, config);
            const metricsRes = await axios.get(`${baseURL}/reports/sidebar-metrics`, config);

            console.log(`\nUser ${pm.email} (Role: ${login.data.user?.role || login.data.role}):`);
            console.log(`  - Projects: ${projectsRes.data?.length}`);
            projectsRes.data?.forEach(p => console.log(`      * "${p.name}" (ID: ${p._id || p.id})`));
            console.log(`  - Jobs: ${jobsRes.data?.length}`);
            console.log(`  - Sidebar projects:`, metricsRes.data?.projects?.length);
        } catch (err) {
            console.error(`Error for ${pm.email}:`, err.response?.status, err.response?.data || err.message);
        }
    }
}

testBothPMs();
