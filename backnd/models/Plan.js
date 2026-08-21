const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    tag: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true
    },
    period: {
        type: String,
        default: 'month'
    },
    durationStr: {
        type: String,
        default: '/ month'
    },
    features: [{
        type: String
    }],
    maxUsers: {
        type: Number,
        default: 10
    },
    maxProjects: {
        type: Number,
        default: 5
    },
    maxJobs: {
        type: Number,
        default: 10
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    rolePermissions: {
        type: Map,
        of: [String], // Keys are Role names (e.g. 'ADMIN'), Values are arrays of permission keys
        default: {}
    }
}, {
    timestamps: true
});

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
