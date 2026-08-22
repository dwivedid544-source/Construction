const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    userName: {
        type: String
    },
    userEmail: {
        type: String
    },
    action: {
        type: String,
        required: true // e.g., 'User Login', 'Failed Login', 'PLAN_CREATED'
    },
    module: {
        type: String,
        required: true,
        default: 'Authentication'
    },
    details: {
        type: String
    },
    ipAddress: {
        type: String,
        default: '127.0.0.1'
    },
    userAgent: String,
    metadata: Object,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
