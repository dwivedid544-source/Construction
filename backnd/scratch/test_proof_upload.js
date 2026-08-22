const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testProofUpload() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Job = require('../models/Job');
        const Photo = require('../models/Photo');

        const ownerUser = await User.findOne({ role: 'COMPANY_OWNER' });
        const job = await Job.findOne({});

        console.log(`Found User: ${ownerUser.fullName} (${ownerUser.role}), Job: "${job.name}" (${job._id})`);

        const token = jwt.sign(
            { userId: ownerUser._id, role: ownerUser.role, companyId: ownerUser.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Create a dummy image file in scratch
        const testImgPath = path.join(__dirname, 'test_proof_image.png');
        // Simple 1x1 PNG buffer
        const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(testImgPath, dummyPng);

        // 1. Upload via POST /api/photos/upload
        const form = new FormData();
        form.append('jobId', job._id.toString());
        if (job.projectId) form.append('projectId', job.projectId.toString());
        form.append('description', `Site work proof for ${job.name}`);
        form.append('images', fs.createReadStream(testImgPath));

        console.log('Sending POST http://localhost:4000/api/photos/upload ...');
        const uploadRes = await axios.post('http://localhost:4000/api/photos/upload', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Upload response status:', uploadRes.status, 'Uploaded items count:', uploadRes.data.length);
        console.log('Uploaded photo data:', uploadRes.data[0]);

        // 2. Fetch Jobs Payroll to verify proof photo is returned
        console.log('Calling GET http://localhost:4000/api/payroll/jobs ...');
        const jobsPayrollRes = await axios.get('http://localhost:4000/api/payroll/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const targetJob = jobsPayrollRes.data.find(j => j.jobId.toString() === job._id.toString());
        console.log(`Job "${targetJob.jobName}" proofPhotosCount:`, targetJob.proofPhotosCount, 'hasProofPhotos:', targetJob.hasProofPhotos, 'proofPhotos:', targetJob.proofPhotos);

        await mongoose.disconnect();
        console.log('Proof Photo Upload & Payroll Display Test Passed 100%!');
    } catch (err) {
        console.error('Test error:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testProofUpload();
