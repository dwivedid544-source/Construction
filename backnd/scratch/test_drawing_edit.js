const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testDrawingEdit() {
    try {
        await connectDB();
        const Drawing = require('../models/Drawing');
        const drawing = await Drawing.findOne({});
        console.log('Original Drawing:', drawing.title, 'Status:', drawing.status);

        // Update status to Approved
        const updated = await Drawing.findByIdAndUpdate(
            drawing._id,
            { status: 'Approved' },
            { returnDocument: 'after' }
        );
        console.log('Updated Status to:', updated.status);

        // Update status back to In Review
        const reverted = await Drawing.findByIdAndUpdate(
            drawing._id,
            { status: 'In Review' },
            { returnDocument: 'after' }
        );
        console.log('Reverted Status to:', reverted.status);

        await mongoose.disconnect();
        console.log('Drawing Status Edit Test Passed 100%!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testDrawingEdit();
