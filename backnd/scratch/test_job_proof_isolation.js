const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testJobProofIsolation() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Job = require('../models/Job');
        const Photo = require('../models/Photo');

        const ownerUser = await User.findOne({ role: 'COMPANY_OWNER' });
        const jobs = await Job.find({});

        if (jobs.length < 2) {
            console.log('Need at least 2 jobs to test isolation');
            process.exit(0);
        }

        const jobA = jobs[0];
        const jobB = jobs[1];

        console.log(`Job A: "${jobA.name}" (${jobA._id})`);
        console.log(`Job B: "${jobB.name}" (${jobB._id})`);

        // Clean existing photos for test
        await Photo.deleteMany({ companyId: ownerUser.companyId });

        const token = jwt.sign(
            { userId: ownerUser._id, role: ownerUser.role, companyId: ownerUser.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Upload photo for Job A only
        const testImgPath = path.join(__dirname, 'test_proof_image.png');
        const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(testImgPath, dummyPng);

        const form = new FormData();
        form.append('jobId', jobA._id.toString());
        if (jobA.projectId) form.append('projectId', jobA.projectId.toString());
        form.append('description', `Site work proof for ${jobA.name}`);
        form.append('images', fs.createReadStream(testImgPath));

        console.log('Uploading photo for Job A only...');
        const uploadRes = await axios.post('http://localhost:4000/api/photos/upload', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        const uploadedPhotoId = uploadRes.data[0]._id;
        console.log('Uploaded Photo ID:', uploadedPhotoId);

        // Check Job Payroll feed
        const jobsPayrollRes = await axios.get('http://localhost:4000/api/payroll/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const resJobA = jobsPayrollRes.data.find(j => j.jobId.toString() === jobA._id.toString());
        const resJobB = jobsPayrollRes.data.find(j => j.jobId.toString() === jobB._id.toString());

        console.log(`Result Job A "${resJobA.jobName}": count = ${resJobA.proofPhotosCount}, hasProof = ${resJobA.hasProofPhotos}`);
        console.log(`Result Job B "${resJobB.jobName}": count = ${resJobB.proofPhotosCount}, hasProof = ${resJobB.hasProofPhotos}`);

        if (resJobA.proofPhotosCount === 1 && resJobB.proofPhotosCount === 0) {
            console.log('PASS: Job A has 1 photo, Job B has 0 photos! Isolation is 100% correct.');
        } else {
            throw new Error(`FAIL: Isolation failed. Job A: ${resJobA.proofPhotosCount}, Job B: ${resJobB.proofPhotosCount}`);
        }

        // Test Delete Photo
        console.log('Testing photo deletion via DELETE /api/photos/' + uploadedPhotoId);
        const delRes = await axios.delete(`http://localhost:4000/api/photos/${uploadedPhotoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Delete response:', delRes.data);

        // Re-check Job Payroll feed
        const postDelRes = await axios.get('http://localhost:4000/api/payroll/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const postJobA = postDelRes.data.find(j => j.jobId.toString() === jobA._id.toString());
        console.log(`After delete, Job A "${postJobA.jobName}": count = ${postJobA.proofPhotosCount}, hasProof = ${postJobA.hasProofPhotos}`);

        if (postJobA.proofPhotosCount === 0) {
            console.log('PASS: Photo successfully deleted from Job A!');
        } else {
            throw new Error('FAIL: Photo still exists after deletion');
        }

        await mongoose.disconnect();
        console.log('All tests passed successfully!');
    } catch (err) {
        console.error('Test error:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testJobProofIsolation();
