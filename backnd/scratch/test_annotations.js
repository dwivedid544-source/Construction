const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function testAnnotations() {
    try {
        await connectDB();
        const Drawing = require('../models/Drawing');
        const DrawingAnnotation = require('../models/DrawingAnnotation');
        const User = require('../models/User');

        const drawing = await Drawing.findOne({});
        console.log('Using Drawing:', drawing ? drawing.title : 'None', drawing ? drawing._id : '');

        if (!drawing) {
            throw new Error('No drawing found');
        }

        const user = await User.findOne({});

        // 1. Create text review note annotation
        const ann1 = await DrawingAnnotation.create({
            drawingId: drawing._id,
            userId: user._id,
            userName: user.fullName,
            userRole: user.role,
            pageNumber: 1,
            type: 'text',
            coordinates: { x1: 100, y1: 150, x2: 200, y2: 250 },
            content: 'Verify foundation wall thickness before pouring concrete',
            status: 'open',
            isVisibleToClient: true
        });

        console.log('Created Review Note 1:', ann1._id, ann1.type, ann1.content);

        // 2. Create pen markup annotation
        const ann2 = await DrawingAnnotation.create({
            drawingId: drawing._id,
            userId: user._id,
            userName: user.fullName,
            userRole: user.role,
            pageNumber: 1,
            type: 'pen',
            coordinates: { points: [{ x: 50, y: 50 }, { x: 80, y: 120 }, { x: 150, y: 180 }] },
            content: '',
            status: 'open'
        });

        console.log('Created Pen Markup 2:', ann2._id, ann2.type);

        // 3. Query all annotations for this drawing
        const foundAnns = await DrawingAnnotation.find({ drawingId: drawing._id });
        console.log(`Found ${foundAnns.length} annotations for drawing:`);
        foundAnns.forEach((a, i) => {
            console.log(`  ${i + 1}. [${a.type}] "${a.content || '(drawing markup)'}" by ${a.userName || 'Unknown'}`);
        });

        // 4. Update annotation
        const updated = await DrawingAnnotation.findByIdAndUpdate(
            ann1._id,
            { status: 'resolved', content: 'Wall thickness verified: 12 inches.' },
            { new: true }
        );
        console.log('Updated Annotation 1 status:', updated.status, 'new content:', updated.content);

        // Cleanup
        await DrawingAnnotation.deleteOne({ _id: ann1._id });
        await DrawingAnnotation.deleteOne({ _id: ann2._id });
        console.log('Cleaned up test annotations');

        await mongoose.disconnect();
        console.log('Drawing Annotations / Review Notes Test Passed 100%!');
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testAnnotations();
