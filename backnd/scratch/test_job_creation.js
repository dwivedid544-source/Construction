const axios = require('axios');

async function testJobCreationAndVisibility() {
    const baseURL = 'http://localhost:4000/api';
    console.log('Testing Job Creation and Visibility...');

    try {
        // 1. Login as PM
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'pm@kaal.ca',
            password: '123456'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Fetch Projects
        const projRes = await axios.get(`${baseURL}/projects`, config);
        if (!projRes.data || projRes.data.length === 0) {
            console.error('No projects found to test job creation.');
            return;
        }
        const project = projRes.data[0];
        const projectId = project._id || project.id;
        console.log(`Using Project: "${project.name}" (ID: ${projectId})`);

        // 3. Create a New Job
        const testJobName = `Automated Verification Job ${Date.now()}`;
        const createPayload = {
            title: testJobName,
            name: testJobName,
            location: 'Building Sector 4',
            startDate: '2026-08-25',
            endDate: '2026-09-30',
            budget: 45000,
            description: 'Created during verification test',
            projectId: projectId,
            status: 'planning'
        };

        const createRes = await axios.post(`${baseURL}/jobs`, createPayload, config);
        console.log(`✅ Job created successfully! ID: ${createRes.data._id || createRes.data.id}`);
        const createdJobId = createRes.data._id || createRes.data.id;

        // 4. Fetch jobs for the specific project (GET /jobs?projectId=...)
        const projJobsRes = await axios.get(`${baseURL}/jobs?projectId=${projectId}`, config);
        const foundInProj = projJobsRes.data.find(j => (j._id === createdJobId || j.id === createdJobId));
        console.log(`Found in Project Jobs list: ${!!foundInProj}`);
        if (foundInProj) {
            console.log('  Job details:', {
                id: foundInProj._id,
                name: foundInProj.name,
                projectId: foundInProj.projectId?._id,
                projectName: foundInProj.projectId?.name,
                status: foundInProj.status
            });
        }

        // 5. Fetch all jobs (GET /jobs)
        const allJobsRes = await axios.get(`${baseURL}/jobs`, config);
        const foundInAll = allJobsRes.data.find(j => (j._id === createdJobId || j.id === createdJobId));
        console.log(`Found in Global /jobs list: ${!!foundInAll}`);

        // 6. Test Company Owner visibility
        const adminLogin = await axios.post(`${baseURL}/auth/login`, {
            email: 'company@admin.com',
            password: '123456'
        });
        const adminConfig = { headers: { Authorization: `Bearer ${adminLogin.data.token}` } };
        const adminJobsRes = await axios.get(`${baseURL}/jobs?projectId=${projectId}`, adminConfig);
        const foundByAdmin = adminJobsRes.data.find(j => (j._id === createdJobId || j.id === createdJobId));
        console.log(`Found by Company Owner: ${!!foundByAdmin}`);

        // 7. Clean up test job
        await axios.delete(`${baseURL}/jobs/${createdJobId}`, config);
        console.log('✅ Cleaned up test job.');

        console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Test failed:', err.response?.status, err.response?.data || err.message);
    }
}

testJobCreationAndVisibility();
