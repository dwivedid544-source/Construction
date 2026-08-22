const mongoose = require('mongoose');

const drawingAnnotationSchema = new mongoose.Schema({
    drawingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drawing',
        required: true
    },
    versionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    userName: {
        type: String
    },
    userRole: {
        type: String
    },
    pageNumber: {
        type: Number,
        default: 1
    },
    type: {
        type: String,
        default: 'comment'
    },
    coordinates: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    content: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'open'
    },
    isVisibleToClient: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

drawingAnnotationSchema.index({ drawingId: 1 });

const DrawingAnnotation = mongoose.model('DrawingAnnotation', drawingAnnotationSchema);

module.exports = DrawingAnnotation;
