require('dotenv').config();
const mongoose = require('mongoose');
const prisma = require('../config/prisma');
const { sendEmail } = require('../utils/emailService');
const Razorpay = require('razorpay');

async function runTests() {
    console.log('=== 1. TESTING MONGODB CONNECTION ===');
    console.log('URI:', process.env.MONGODB_URI);
    
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'construction_saas'
        });
        console.log('✅ MongoDB connected successfully to host:', conn.connection.host);

        // Test querying models via the prisma proxy adapter
        const plansCount = await prisma.plan.count();
        console.log('✅ Plans count in MongoDB:', plansCount);

        const usersCount = await prisma.user.count();
        console.log('✅ Users count in MongoDB:', usersCount);

        const companiesCount = await prisma.company.count();
        console.log('✅ Companies count in MongoDB:', companiesCount);

        // If no plans exist, let's seed basic plans
        if (plansCount === 0) {
            console.log('Seeding initial plans...');
            await prisma.plan.create({
                data: {
                    name: 'Free Trial',
                    price: 0,
                    period: 'month',
                    maxProjects: 2,
                    maxUsers: 5,
                    features: ['Basic Project Management', 'Daily Logs', '7-Day Free Access']
                }
            });
            await prisma.plan.create({
                data: {
                    name: 'Starter',
                    price: 599,
                    period: 'month',
                    maxProjects: 5,
                    maxUsers: 15,
                    features: ['Projects & Tasks', 'Labor & Daily Logs', 'Financials & Invoicing']
                }
            });
            await prisma.plan.create({
                data: {
                    name: 'Pro',
                    price: 1299,
                    period: 'month',
                    maxProjects: 20,
                    maxUsers: 50,
                    isPopular: true,
                    features: ['All Features', 'Unlimited Projects', 'Dedicated Support', 'GPS Tracking']
                }
            });
            console.log('✅ Initial plans seeded!');
        }

    } catch (err) {
        console.error('❌ MongoDB Error:', err.message);
    }

    console.log('\n=== 2. TESTING RAZORPAY CONFIGURATION ===');
    try {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        console.log('Razorpay Key ID:', key_id);
        const rzp = new Razorpay({ key_id, key_secret });
        
        // Create a test order
        const testOrder = await rzp.orders.create({
            amount: 100, // 1 INR in paise
            currency: 'INR',
            receipt: 'test_rcpt_' + Date.now().toString().slice(-6),
            notes: { test: 'KT Construct Integration Test' }
        });
        console.log('✅ Razorpay Order Created Successfully! Order ID:', testOrder.id, 'Amount:', testOrder.amount);
    } catch (err) {
        console.error('❌ Razorpay Error:', err.message);
    }

    console.log('\n=== 3. TESTING BREVO EMAIL CONFIGURATION ===');
    try {
        console.log('Brevo API Key present:', !!process.env.BREVO_API_KEY);
        console.log('Brevo Sender:', process.env.BREVO_SENDER_NAME, `<${process.env.BREVO_SENDER_EMAIL}>`);
        
        // Send a test email to the support/sender email or test address
        const targetEmail = process.env.BREVO_SENDER_EMAIL || 'info@kiaantechnology.com';
        const emailResult = await sendEmail({
            toEmail: targetEmail,
            toName: 'KT Construct Admin',
            subject: 'KT Construct System Check - Brevo Integration Verified',
            htmlContent: '<h3>Brevo Integration Successful</h3><p>This is a verification email confirming real Brevo transactional mail delivery for KT Construct SaaS.</p>'
        });
        console.log('Brevo Email Test Result:', emailResult);
    } catch (err) {
        console.error('❌ Brevo Email Error:', err.message);
    }

    console.log('\n=== ALL TESTS COMPLETE ===');
    process.exit(0);
}

runTests();
