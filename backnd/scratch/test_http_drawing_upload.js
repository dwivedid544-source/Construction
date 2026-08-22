const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testHttpUpload() {
    try {
        await connectDB();
        const User = require('../models/User');
        const Project = require('../models/Project');

        const pmUser = await User.findOne({ role: 'PM' });
        const project = await Project.findOne({ companyId: pmUser.companyId });

        const token = jwt.sign(
            { userId: pmUser._id, role: pmUser.role, companyId: pmUser.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Create a dummy image buffer
        const dummyBuffer = Buffer.from('FakeImageDataForDrawingTest');
        
        const form = new FormData();
        form.append('projectId', project._id.toString());
        form.append('title', 'ground floor test');
        form.append('drawingNumber', 'G-01');
        form.append('category', 'Architectural view');
        form.append('status', 'Draft');
        form.append('file', dummyBuffer, { filename: 'ground_floor.jpg', contentType: 'image/jpeg' });

        console.log('Sending multipart POST /api/drawings to http://localhost:4000/api/drawings ...');
        const res = await axios.post('http://localhost:4000/api/drawings', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('HTTP POST Response status:', res.status);
        console.log('Created Drawing ID:', res.data._id || res.data.id, 'File URL:', res.data.fileUrl);

        // Clean up created drawing
        const Drawing = require('../models/Drawing');
        await Drawing.deleteOne({ _id: res.data._id || res.data.id });
        console.log('Cleaned up HTTP test drawing');

        await mongoose.disconnect();
        console.log('HTTP Multipart Upload Test Passed 100%!');
    } catch (err) {
        console.error('HTTP Test Error:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testHttpUpload();
