/**
 * emailService.js — Centralized Brevo Transactional Email Service.
 */

'use strict';

const apiKey = () => process.env.BREVO_API_KEY;
const senderEmail = () => process.env.SENDER_EMAIL || process.env.MAIL_FROM_EMAIL || process.env.MAIL_FROM || 'info@kiaantechnology.com';
const senderName = () => process.env.SENDER_NAME || 'Kiaan Technology Pvt Ltd';

/**
 * Core function to send HTML emails via Brevo API v3.
 * Securely logs responses without exposing sensitive credentials or API keys.
 */
async function sendEmail({ toEmail, toName, subject, htmlContent }) {
  if (!apiKey()) {
    console.warn('[EmailService] BREVO_API_KEY missing. Email skipped.');
    return { success: false, reason: 'API_KEY_MISSING' };
  }

  if (!toEmail) {
    console.warn('[EmailService] Recipient email (toEmail) is missing. Email skipped.');
    return { success: false, reason: 'RECIPIENT_EMAIL_MISSING' };
  }

  try {
    const payload = {
      sender: { name: senderName(), email: senderEmail() },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent,
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      // Secure logging: sanitize error response to prevent secret leakage
      const sanitizedError = typeof data === 'object' && data !== null ? { code: data.code, message: data.message } : data;
      console.error('[EmailService] Brevo API error:', JSON.stringify(sanitizedError));
      return { success: false, error: sanitizedError };
    }

    console.log(`[EmailService] Email sent successfully to ${toEmail}. Message ID:`, data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('[EmailService] Network error while sending email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Welcome & Onboarding Email for New Registration (Delegates to Custom KT Construct Email)
 */
async function sendWelcomeEmail({ toEmail, toName, companyName, planName, expiryDate, loginUrl, price = '0.00' }) {
  return sendSubscriptionWelcomeEmail({
    toEmail,
    companyName: companyName || toName,
    planName: planName || 'Starter 1',
    price: price,
    duration: String(planName).toLowerCase().includes('7 day') ? '7 Days' : 'Monthly',
    expiryDate,
    loginUrl,
  });
}

/**
 * 2. Password Reset Email
 */
async function sendPasswordResetEmail({ toEmail, toName, resetUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Reset Your Password</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'User'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            You requested a password reset for your account. Click the button below to set a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #155dff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
              Set New Password
            </a>
          </div>

          <p style="font-size: 13px; color: #94a3b8;">
            If you did not request this password reset, please ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: 'Security Alert: Password Reset Request',
    htmlContent: html,
  });
}

/**
 * 3. OTP Verification Email
 */
async function sendOtpEmail({ toEmail, toName, otpCode }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Your Verification Code</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'User'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Use the following One-Time Password (OTP) to verify your account or action:
          </p>
          
          <div style="text-align: center; margin: 30px 0; background: #f1f5f9; padding: 20px; border-radius: 12px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
          </div>

          <p style="font-size: 13px; color: #94a3b8;">
            This OTP code is valid for 10 minutes. Please do not share this code with anyone.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: 'Your Verification Code (OTP)',
    htmlContent: html,
  });
}

/**
 * 4. Payment Confirmation Email
 */
async function sendPaymentSuccessEmail({ toEmail, toName, amount, planName, paymentId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #10b981; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Payment Confirmed</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'Customer'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Your payment for <strong>${planName}</strong> has been successfully processed and your subscription is active!
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Amount Paid:</strong> ₹${amount}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Subscription Plan:</strong> ${planName}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Payment ID:</strong> ${paymentId || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Payment Receipt: ${planName} Activated`,
    htmlContent: html,
  });
}

/**
 * 5. Invoice & Payment Receipt Email
 */
async function sendInvoiceEmail({ toEmail, toName, invoiceNumber, amount, dueDate, downloadUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #0284c7; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Invoice Notification</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'Customer'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            A new invoice <strong>${invoiceNumber}</strong> has been generated for your account.
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${amount}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Due Date:</strong> ${dueDate || 'Immediate'}</p>
          </div>

          ${downloadUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
              View / Download Invoice
            </a>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Invoice ${invoiceNumber} from Kiaan Technology`,
    htmlContent: html,
  });
}

/**
 * 6. Membership / Subscription Notification Email
 */
async function sendMembershipEmail({ toEmail, toName, status, planName, expiryDate }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #8b5cf6; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Membership Update</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'User'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Your membership status has been updated to: <strong>${status}</strong>.
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Plan:</strong> ${planName}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Status / Expiry:</strong> ${expiryDate || status}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Membership Alert: ${status}`,
    htmlContent: html,
  });
}

/**
 * 7. Booking / CRM Notification Email
 */
async function sendBookingNotificationEmail({ toEmail, toName, bookingTitle, details, date }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #f59e0b; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Booking Update</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'User'},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            New updates for booking <strong>${bookingTitle}</strong>:
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Title:</strong> ${bookingTitle}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Details:</strong> ${details || 'N/A'}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Date:</strong> ${date || new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Booking Notification: ${bookingTitle}`,
    htmlContent: html,
  });
}

/**
 * 8. Admin / System Notification Email
 */
async function sendAdminNotificationEmail({ toEmail, toName, title, message }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #dc2626; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">System Notification</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #475569;">Hello ${toName || 'Admin'},</p>
          <h3 style="color: #0f172a; margin-top: 0;">${title}</h3>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">${message}</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `[Admin Alert] ${title}`,
    htmlContent: html,
  });
}

/**
 * 9. Subscription Welcome & Activation Notification Email (Matching User Specification)
 */
/**
 * 9. Subscription Welcome & Activation Notification Email (Matching Reference Image Specification)
 */
/**
 * 9. Subscription Welcome & Activation Notification Email (KT Construct Specification)
 */
async function sendSubscriptionWelcomeEmail({
  toEmail,
  companyName,
  plainPassword,
  planName = 'Starter 1',
  price = '1.00',
  duration = 'Monthly',
  startDate,
  expiryDate,
  loginUrl,
  passwordSetupUrl,
}) {
  const formattedPrice = typeof price === 'number' ? price.toFixed(2) : (String(price).replace(/[^0-9.]/g, '') || '1.00');
  const appLoginUrl = loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const formatEmailDate = (dateVal) => {
    if (!dateVal) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const startFormatted = formatEmailDate(startDate);
  
  let expiryFormatted = expiryDate;
  if (!expiryFormatted) {
    const startObj = startDate ? new Date(startDate) : new Date();
    const expObj = new Date(startObj);
    const durLower = String(duration).toLowerCase();
    if (durLower.includes('7 day') || durLower.includes('week')) {
      expObj.setDate(expObj.getDate() + 7);
    } else if (durLower.includes('year') || durLower.includes('annual')) {
      expObj.setFullYear(expObj.getFullYear() + 1);
    } else {
      expObj.setMonth(expObj.getMonth() + 1);
    }
    expiryFormatted = formatEmailDate(expObj);
  } else {
    expiryFormatted = formatEmailDate(expiryDate);
  }

  const passwordDisplay = plainPassword
    ? plainPassword
    : passwordSetupUrl
    ? `<a href="${passwordSetupUrl}" style="color: #2563eb; text-decoration: underline;">Set / Reset Password</a>`
    : 'Saved during registration';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f5f9; padding: 30px 12px; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 490px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 18px rgba(0,0,0,0.05);">
        
        <!-- Header Banner for KT Construct -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px 24px; color: #ffffff;">
          <div style="font-size: 17px; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 8px;">
            🏗️ KT Construct
          </div>
          <div style="font-size: 11px; opacity: 0.85; margin-bottom: 16px; letter-spacing: 0.3px; text-transform: uppercase; font-weight: 600;">
            Official SaaS Activation Notification
          </div>
          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.4;">
            Welcome to KT Construct - Your Account is Ready
          </h2>
        </div>

        <!-- Content Body -->
        <div style="padding: 24px 26px; line-height: 1.6; font-size: 13px; color: #334155;">
          <p style="margin: 0 0 12px 0;">Hello <strong>${companyName || 'Member'}</strong> ,</p>
          <p style="margin: 0 0 12px 0;">Welcome to <strong>KT Construct</strong> (Construction Management ERP).</p>
          <p style="margin: 0 0 20px 0;">Your account and plan subscription have been successfully activated.</p>

          <!-- Account Details -->
          <div style="margin-bottom: 22px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b; font-size: 13px;">Account Details:</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Name: ${companyName || 'KT Construct Client'}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Email / Login ID: <a href="mailto:${toEmail}" style="color: #2563eb; text-decoration: none;">${toEmail}</a></p>
            <p style="margin: 0 0 4px 0; color: #475569;">Password: ${passwordDisplay}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Software: KT Construct Construction ERP</p>
          </div>

          <!-- Plan Details -->
          <div style="margin-bottom: 22px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b; font-size: 13px;">Plan Details:</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Plan: ${planName}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Price: ₹${formattedPrice}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Duration: ${duration}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Start Date: ${startFormatted}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Expiry Date: ${expiryFormatted}</p>
          </div>

          <!-- Included Software Capabilities -->
          <div style="margin-bottom: 22px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #f1f5f9;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a; font-size: 12px;">Included Features in KT Construct Portal:</p>
            <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 12px;">
              <li style="margin-bottom: 4px;">🏗️ <strong>Project & Daily Logs:</strong> Site progress tracking & schedules</li>
              <li style="margin-bottom: 4px;">👷 <strong>Labor & Attendance:</strong> Worker logs & payroll tracking</li>
              <li style="margin-bottom: 4px;">📦 <strong>Materials & Vendors:</strong> Purchase orders & trade bidding</li>
              <li style="margin-bottom: 0;">📊 <strong>Invoicing & Billing:</strong> Client invoices & financial audit logs</li>
            </ul>
          </div>

          <!-- Login Link -->
          <div style="margin-bottom: 22px;">
            <p style="margin: 0 0 4px 0; color: #1e293b; font-weight: 600;">Login Portal:</p>
            <a href="${appLoginUrl}" style="color: #2563eb; font-size: 13px; text-decoration: underline; word-break: break-all;">
              ${appLoginUrl}
            </a>
          </div>

          <p style="margin: 0 0 16px 0; color: #475569; font-size: 13px;">Please keep your login credentials secure.</p>
          
          <!-- Support Details -->
          <div style="margin-bottom: 22px; padding: 12px 14px; background: #eef2ff; border-radius: 8px; border: 1px solid #e0e7ff; font-size: 12px; color: #3730a3;">
            💬 <strong>Need Help?</strong> Contact KT Construct Support at <a href="mailto:support@kiaantechnology.com" style="color: #4338ca; text-decoration: underline; font-weight: 600;">support@kiaantechnology.com</a>
          </div>

          <p style="margin: 0; color: #334155;">Thank you,</p>
          <p style="margin: 2px 0 24px 0; font-weight: 700; color: #0f172a;">Kiaan Technology Pvt Ltd</p>

          <!-- Footer -->
          <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
            This is an automated message from KT Construct . Please do not reply.
          </div>
        </div>
      </div>
    </div>
  `;

  const userResult = await sendEmail({
    toEmail,
    toName: companyName,
    subject: `Welcome to KT Construct - Your Account is Ready`,
    htmlContent: html,
  });

  const adminEmail = process.env.SENDER_EMAIL || 'lightlabcreation@gmail.com';
  if (adminEmail && adminEmail !== toEmail) {
    sendEmail({
      toEmail: adminEmail,
      toName: 'Admin Copy',
      subject: `[New Subscription Alert] ${companyName} (${planName})`,
      htmlContent: html,
    }).catch(err => console.error('[EmailService] Admin copy email error:', err));
  }

  return userResult;
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendPaymentSuccessEmail,
  sendInvoiceEmail,
  sendMembershipEmail,
  sendBookingNotificationEmail,
  sendAdminNotificationEmail,
  sendSubscriptionWelcomeEmail,
};

