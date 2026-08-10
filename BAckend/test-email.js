/**
 * test-email.js — Quick Verification Script for Brevo Email Service.
 * Usage: node test-email.js [recipient-email]
 */

'use strict';

require('dotenv').config();
const { sendWelcomeEmail } = require('./utils/emailService');

const targetEmail = process.argv[2] || 'dwivedid544@gmail.com';

console.log('────────────────────────────────────────────────────────');
console.log('  Testing Brevo SMTP / API Key Email Delivery');
console.log('────────────────────────────────────────────────────────');
console.log(`  SENDER EMAIL: ${process.env.SENDER_EMAIL || 'lightlabcreation@gmail.com'}`);
console.log(`  TARGET EMAIL: ${targetEmail}`);
console.log(`  BREVO API KEY: ${process.env.BREVO_API_KEY ? 'Present (Configured)' : 'Missing'}`);
console.log('────────────────────────────────────────────────────────\n');

(async () => {
  console.log('  Sending test email via Brevo...');
  const result = await sendWelcomeEmail({
    toEmail: targetEmail,
    toName: 'Test Recipient',
    companyName: 'Test Construction Co.',
    planName: 'Standard 799',
    expiryDate: '7 Days',
    loginUrl: 'http://localhost:5173/login',
  });

  console.log('\n────────────────────────────────────────────────────────');
  if (result.success) {
    console.log('  ✅ SUCCESS: Email dispatched successfully!');
    console.log('  Message ID:', result.messageId);
    console.log('  Check your inbox / spam folder at:', targetEmail);
  } else {
    console.log('  ❌ FAILED: Could not send email.');
    console.log('  Error details:', JSON.stringify(result.error || result, null, 2));

    if (result.error?.code === 'unauthorized') {
      console.log('\n  👉 HOW TO FIX THIS BREVO AUTHORIZATION ERROR:');
      console.log('  1. Go to: https://app.brevo.com/security/authorised_ips');
      console.log('  2. Click "Add an IP address" and add your current IP address (or disable IP restrictions).');
    } else if (result.error?.message?.includes('sender')) {
      console.log('\n  👉 HOW TO FIX SENDER EMAIL ERROR:');
      console.log('  1. Go to: https://app.brevo.com/senders');
      console.log('  2. Add your sender email (e.g. SENDER_EMAIL in .env) as a verified sender.');
    }
  }
  console.log('────────────────────────────────────────────────────────\n');
})();
