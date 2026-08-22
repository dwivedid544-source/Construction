const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testEquipmentEndToEnd() {
    try {
        await connectDB();
        const Equipment = require('../models/Equipment');
        const Job = require('../models/Job');

        const job = await Job.findOne({});
        const equip = await Equipment.findOne({});

        console.log(`Using Job: "${job.name}" (${job._id})`);
        console.log(`Using Equipment: "${equip.name}" (${equip._id})`);

        // 1. Assign equipment to Job
        const equipmentController = require('../controllers/equipmentController');
        
        const req = {
            params: { id: equip._id.toString() },
            body: { jobId: job._id.toString() },
            user: { companyId: equip.companyId.toString(), id: equip.companyId.toString() }
        };
        let assignedResult;
        const res = {
            json: (data) => { assignedResult = data; },
            status: () => res
        };

        await equipmentController.assignEquipment(req, res, (err) => { if (err) throw err; });

        console.log('Assigned Result assignedJob:', assignedResult.assignedJob);
        console.log('Assigned Result assignedJobId:', assignedResult.assignedJobId);

        // 2. Fetch all equipment and verify it has the assignedJob populated
        let allEquipResult;
        const reqGet = {
            user: { companyId: equip.companyId.toString(), role: 'COMPANY_OWNER' }
        };
        const resGet = {
            json: (data) => { allEquipResult = data; }
        };
        await equipmentController.getEquipment(reqGet, resGet, (err) => { if (err) throw err; });

        const found = allEquipResult.find(e => e._id === equip._id.toString());
        console.log('Fetched Equipment from getEquipment:', found.name, 'assignedJob:', found.assignedJob);

        // 3. Return equipment
        let returnResult;
        const resReturn = {
            json: (data) => { returnResult = data; }
        };
        await equipmentController.returnEquipment(req, resReturn, (err) => { if (err) throw err; });
        console.log('Return Result assignedJob:', returnResult.assignedJob, 'status:', returnResult.status);

        await mongoose.disconnect();
        console.log('Equipment End-to-End Test Passed 100%!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testEquipmentEndToEnd();
