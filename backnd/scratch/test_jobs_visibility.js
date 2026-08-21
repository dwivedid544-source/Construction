const axios = require('axios');

async function testJobs() {
    const baseURL = 'http://localhost:4000/api';
    console.log('Testing Jobs visibility for different roles...');

    const roles = [
        { email: 'company@admin.com', password: '123456', label: 'COMPANY_OWNER' },
        { email: 'pm@kaal.ca', password: '123456', label: 'PM' },
        { email: 'foreman@kaal.ca', password: '123456', label: 'FOREMAN' },
        { email: 'worker@kaal.ca', password: '123456', label: 'WORKER' }
    ];

    for (const role of roles) {
        try {
            const loginRes = await axios.post(`${baseURL}/auth/login`, {
                email: role.email,
                password: role.password
            });
            const token = loginRes.data.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // 1. Get projects
            const projRes = await axios.get(`${baseURL}/projects`, config);
            console.log(`\n--- Role: ${role.label} (${role.email}) ---`);
            console.log(`Projects visible: ${projRes.data?.length}`);
            const firstProject = projRes.data[0];

            // 2. Get all jobs
            const jobsRes = await axios.get(`${baseURL}/jobs`, config);
            console.log(`All jobs visible (/jobs): ${jobsRes.data?.length}`);
            if (jobsRes.data?.length > 0) {
                jobsRes.data.forEach(j => {
                    console.log(`  - Job "${j.name}" (ID: ${j._id || j.id}, ProjectId: ${j.projectId?._id || j.projectId?.name || j.projectId})`);
                });
            }

            // 3. Get jobs for specific project if exists
            if (firstProject) {
                const projId = firstProject._id || firstProject.id;
                const projJobsRes = await axios.get(`${baseURL}/jobs?projectId=${projId}`, config);
                console.log(`Jobs for project "${firstProject.name}" (${projId}): ${projJobsRes.data?.length}`);
            }
        } catch (err) {
            console.error(`Error for ${role.label}:`, err.response?.status, err.response?.data || err.message);
        }
    }
}

testJobs();
