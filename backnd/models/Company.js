const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    logo: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    subscriptionPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'past_due', 'canceled', 'pending'],
        default: 'active'
    },
    storageUsed: {
        type: Number,
        default: 0 // in bytes
    },
    startDate: {
        type: Date
    },
    expireDate: {
        type: Date
    },
    planType: {
        type: String,
        enum: ['Monthly', 'Yearly', 'Custom'],
        default: 'Monthly'
    },
    invoiceSettings: {
        companyName: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        taxNumber: { type: String, default: '' },
        logo: { type: String, default: '' },
        defaultTaxRate: { type: Number, default: 15 },
        defaultPaymentTerms: { type: String, default: 'Net 15' },
        bankDetails: { type: String, default: '' },
        notes: { type: String, default: '' },
        terms: { type: String, default: '' }
    }
}, {
    timestamps: true
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
