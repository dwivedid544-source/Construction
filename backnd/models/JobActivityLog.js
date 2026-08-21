const mongoose = require('mongoose');

const jobActivityLogSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    actionType: {
        type: String,
        default: 'CREATED'
    },
    type: {
        type: String,
        default: 'CREATED'
    },
    description: {
        type: String,
        default: ''
    },
    details: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save hook to normalize aliases
jobActivityLogSchema.pre('save', function(next) {
    if (!this.actionType && this.type) this.actionType = this.type;
    if (!this.type && this.actionType) this.type = this.actionType;
    if (!this.description && this.details) this.description = this.details;
    if (!this.details && this.description) this.details = this.description;
    if (!this.createdBy && this.userId) this.createdBy = this.userId;
    if (!this.userId && this.createdBy) this.userId = this.createdBy;
    next();
});

jobActivityLogSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model('JobActivityLog', jobActivityLogSchema);
