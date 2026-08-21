const mongoose = require('mongoose');

const subscriptionOrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    amountPaise: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
        default: 'PENDING'
    },
    paymentId: {
        type: String
    },
    signature: {
        type: String
    },
    notes: {
        type: Object
    }
}, {
    timestamps: true
});

subscriptionOrderSchema.index({ companyId: 1, status: 1 });

const SubscriptionOrder = mongoose.model('SubscriptionOrder', subscriptionOrderSchema);

module.exports = SubscriptionOrder;
