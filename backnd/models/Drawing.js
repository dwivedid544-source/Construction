const mongoose = require('mongoose');

const drawingSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    drawingNumber: {
        type: String,
        default: ''
    },
    number: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'Architectural'
    },
    fileUrl: {
        type: String
    },
    version: {
        type: String,
        default: '1.0'
    },
    currentVersion: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        default: 'Active'
    },
    versions: [{
        versionNumber: { type: Number, default: 1 },
        version: { type: String, default: '1.0' },
        fileUrl: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        releaseDate: Date,
        description: String
    }]
}, {
    timestamps: true
});

// Optimization: Added indexes for faster queries
drawingSchema.index({ companyId: 1 });
drawingSchema.index({ projectId: 1 });
drawingSchema.index({ companyId: 1, createdAt: -1 }); // For list view sorting

const Drawing = mongoose.model('Drawing', drawingSchema);

module.exports = Drawing;
