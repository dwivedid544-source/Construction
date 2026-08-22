const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function inspectPO() {
    try {
        await connectDB();
        const PurchaseOrder = require('../models/purchaseOrder.model');
        const pos = await PurchaseOrder.find({});
        console.log('All POs in database:');
        for (const po of pos) {
            console.log(`\nPO: ${po.poNumber} (${po._id})`);
            console.log(`subtotal: ${po.subtotal}, tax: ${po.tax}, totalAmount: ${po.totalAmount}`);
            console.log(`items count: ${po.items?.length}`);
            (po.items || []).forEach((item, idx) => {
                console.log(`  [${idx}] desc: ${item.itemName || item.description}, qty: ${item.quantity}, unitPrice: ${item.unitPrice}, total: ${item.total}`);
            });
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectPO();
