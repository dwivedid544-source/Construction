const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testDrawingWorkflow() {
    try {
        await connectDB();
        const Drawing = require('../models/Drawing');
        const Project = require('../models/Project');
        const User = require('../models/User');

        const pmUser = await User.findOne({ role: 'PM' }) || await User.findOne({ role: 'COMPANY_OWNER' });
        console.log('Using User:', pmUser.fullName, pmUser.role, 'CompanyId:', pmUser.companyId);

        const project = await Project.findOne({ companyId: pmUser.companyId });
        console.log('Using Project:', project ? project.name : 'None', project ? project._id : '');

        if (!project) {
            throw new Error('No project found for company');
        }

        // Test creating drawing with "Draft" or custom status and file path
        const newDrawing = await Drawing.create({
            companyId: pmUser.companyId,
            projectId: project._id,
            title: 'ground floor',
            drawingNumber: 'G-01',
            number: 'G-01',
            category: 'Architectural view',
            fileUrl: 'uploads/drawings/test_ground_floor.jpg',
            version: '1.0',
            currentVersion: 1,
            status: 'Draft',
            versions: [{
                versionNumber: 1,
                version: '1.0',
                fileUrl: 'uploads/drawings/test_ground_floor.jpg',
                uploadedBy: pmUser._id,
                uploadedAt: new Date(),
                description: 'Initial upload'
            }]
        });

        console.log('Successfully Created Drawing:', newDrawing._id, newDrawing.title, newDrawing.status);

        // Test querying drawing
        const found = await Drawing.findById(newDrawing._id).populate('projectId', 'name');
        console.log('Query verified drawing:', found.title, 'Project:', found.projectId?.name, 'Versions count:', found.versions?.length);

        // Cleanup
        await Drawing.deleteOne({ _id: newDrawing._id });
        console.log('Cleaned up test drawing');

        await mongoose.disconnect();
        console.log('Drawing upload test passed 100% successfully!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testDrawingWorkflow();
