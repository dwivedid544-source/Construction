const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testHttpAssign() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Job = require('../models/Job');
        const Equipment = require('../models/Equipment');

        const ownerUser = await User.findOne({ role: 'COMPANY_OWNER' });
        const job = await Job.findOne({ name: 'Foundation Exacavation' }) || await Job.findOne({});
        const equip = await Equipment.findOne({ name: "JCB's" }) || await Equipment.findOne({});

        console.log(`Found User: ${ownerUser.fullName}, Job: "${job.name}" (${job._id}), Equipment: "${equip.name}" (${equip._id})`);

        const token = jwt.sign(
            { userId: ownerUser._id, role: ownerUser.role, companyId: ownerUser.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 1. Assign equipment to Job via HTTP POST /api/equipment/:id/assign
        console.log(`Calling POST http://localhost:4000/api/equipment/${equip._id}/assign ...`);
        const assignRes = await axios.post(
            `http://localhost:4000/api/equipment/${equip._id}/assign`,
            { jobId: job._id.toString() },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('HTTP Assign Response status:', assignRes.status, 'assignedJob:', assignRes.data.assignedJob);

        // 2. Fetch all equipment via HTTP GET /api/equipment
        console.log('Calling GET http://localhost:4000/api/equipment ...');
        const getRes = await axios.get(
            'http://localhost:4000/api/equipment',
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('HTTP GET /api/equipment returned count:', getRes.data.length);
        const assignedEquip = getRes.data.find(e => e._id === equip._id.toString());
        console.log(`Verified Equipment "${assignedEquip.name}": assignedJobId = ${assignedEquip.assignedJobId}, assignedJob Name = ${assignedEquip.assignedJob?.name}`);

        await mongoose.disconnect();
        console.log('HTTP Equipment Assignment Test Passed 100%!');
    } catch (err) {
        console.error('HTTP Test Error:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testHttpAssign();
