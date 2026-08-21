/**
 * emailService.js — Centralized Brevo Transactional Email Service
 *
 * Sends real transactional emails using Brevo API v3 (https://api.brevo.com/v3/smtp/email).
 */

'use strict';

const nodemailer = require('nodemailer');

const getApiKey = () => process.env.BREVO_API_KEY;
const getSenderEmail = () => process.env.BREVO_SENDER_EMAIL || process.env.MAIL_FROM_EMAIL || process.env.GMAIL_USER || 'info@kiaantechnology.com';
const getSenderName = () => process.env.BREVO_SENDER_NAME || 'Kiaan Technology Pvt Ltd';

/**
 * Creates SMTP transporter if SMTP or Gmail credentials are present in .env
 */
const getSmtpTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (process.env.GMAIL_USER && (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS)) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS,
      },
    });
  }
  return null;
};

/**
 * Core function to send HTML emails via Brevo API v3 or SMTP / Nodemailer fallback.
 */
async function sendEmail({ toEmail, toName, subject, htmlContent }) {
  if (!toEmail) {
    console.warn('[EmailService] Recipient email (toEmail) missing. Email skipped.');
    return { success: false, reason: 'RECIPIENT_EMAIL_MISSING' };
  }

  const apiKey = getApiKey();
  const smtpTransporter = getSmtpTransporter();

  // Try Brevo HTTP API v3 first if key is present
  if (apiKey) {
    try {
      const payload = {
        sender: { name: getSenderName(), email: getSenderEmail() },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
      };

      console.log(`[EmailService] Sending email to ${toEmail} with subject: "${subject}"...`);

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`[EmailService] ✅ Email sent successfully via Brevo to ${toEmail}. Message ID:`, data.messageId);
        return { success: true, messageId: data.messageId };
      }

      const sanitizedError = typeof data === 'object' && data !== null ? { code: data.code, message: data.message } : data;
      console.error('[EmailService] Brevo API error:', JSON.stringify(sanitizedError));

      // If Brevo failed (e.g. key disabled) and SMTP is available, fallback to SMTP
      if (smtpTransporter) {
        console.log('[EmailService] Attempting SMTP fallback delivery...');
        const info = await smtpTransporter.sendMail({
          from: `"${getSenderName()}" <${getSenderEmail()}>`,
          to: toName ? `"${toName}" <${toEmail}>` : toEmail,
          subject,
          html: htmlContent,
        });
        console.log(`[EmailService] ✅ Email sent via SMTP fallback to ${toEmail}. Message ID:`, info.messageId);
        return { success: true, messageId: info.messageId };
      }

      return { success: false, error: sanitizedError };
    } catch (err) {
      console.error('[EmailService] ❌ Error with Brevo API:', err.message);
      if (smtpTransporter) {
        try {
          const info = await smtpTransporter.sendMail({
            from: `"${getSenderName()}" <${getSenderEmail()}>`,
            to: toName ? `"${toName}" <${toEmail}>` : toEmail,
            subject,
            html: htmlContent,
          });
          console.log(`[EmailService] ✅ Email sent via SMTP fallback to ${toEmail}. Message ID:`, info.messageId);
          return { success: true, messageId: info.messageId };
        } catch (smtpErr) {
          console.error('[EmailService] ❌ SMTP fallback also failed:', smtpErr.message);
        }
      }
      return { success: false, error: err.message };
    }
  }

  // If no Brevo API key but SMTP is provided
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"${getSenderName()}" <${getSenderEmail()}>`,
        to: toName ? `"${toName}" <${toEmail}>` : toEmail,
        subject,
        html: htmlContent,
      });
      console.log(`[EmailService] ✅ Email sent via SMTP to ${toEmail}. Message ID:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error('[EmailService] ❌ SMTP send failed:', smtpErr.message);
      return { success: false, error: smtpErr.message };
    }
  }

  console.warn('[EmailService] Neither valid BREVO_API_KEY nor SMTP credentials configured. Email sending skipped.');
  return { success: false, reason: 'NO_EMAIL_TRANSPORT_CONFIGURED' };
}

/**
 * 1. Subscription Welcome & Account Credentials Email
 */
async function sendSubscriptionWelcomeEmail({
  toEmail,
  companyName,
  fullName,
  plainPassword,
  planName = 'Starter Plan',
  price = '1.00',
  duration = 'Monthly',
  startDate,
  expiryDate,
  loginUrl,
  passwordSetupUrl,
}) {
  const formattedPrice = typeof price === 'number' ? price.toFixed(2) : (String(price).replace(/[^0-9.]/g, '') || '1.00');
  const appLoginUrl = loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const displayName = fullName || companyName || 'Valued Builder';

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
    if (durLower.includes('7 day') || durLower.includes('week') || durLower.includes('trial')) {
      expObj.setDate(expObj.getDate() + 7);
      expiryFormatted = '7 Days';
    } else if (durLower.includes('year') || durLower.includes('annual')) {
      expObj.setFullYear(expObj.getFullYear() + 1);
      expiryFormatted = formatEmailDate(expObj);
    } else {
      expObj.setMonth(expObj.getMonth() + 1);
      expiryFormatted = '30 Days';
    }
  } else {
    expiryFormatted = formatEmailDate(expiryDate);
  }

  const passwordDisplay = plainPassword || '123456';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to KT Construct</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <div style="max-width: 540px; margin: 20px auto; background: #0f172a; border-radius: 20px; overflow: hidden; border: 1px solid rgba(59, 130, 246, 0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
        
        <!-- Header: Matching Screenshot 1 Purple Gradient -->
        <div style="background: linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%); padding: 32px 26px; color: #ffffff;">
          <div style="font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; letter-spacing: 0.5px;">
            🏗️ KT Construct
          </div>
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; opacity: 0.9; margin-bottom: 12px;">
            OFFICIAL SAAS ACTIVATION NOTIFICATION
          </div>
          <div style="font-size: 24px; font-weight: 900; line-height: 1.25; color: #ffffff;">
            Welcome to KT Construct - Your Account is Ready
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px 26px; font-size: 14.5px; line-height: 1.6; color: #cbd5e1;">
          <p style="margin: 0 0 14px 0; font-size: 15px; color: #ffffff;">
            Hello <strong>${displayName}</strong> ,
          </p>
          <p style="margin: 0 0 14px 0; color: #94a3b8;">
            Welcome to <strong>KT Construct</strong> (Construction Management ERP).
          </p>
          <p style="margin: 0 0 22px 0; color: #94a3b8;">
            Your account and plan subscription have been successfully activated.
          </p>

          <!-- Account Details Box -->
          <div style="margin-bottom: 22px;">
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">
              Account Details:
            </div>
            <div style="background: #1e293b; border-radius: 12px; padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); font-size: 14px; line-height: 1.8;">
              <div style="color: #cbd5e1;">Name: <strong style="color: #ffffff;">${displayName}</strong></div>
              <div style="color: #cbd5e1;">Email / Login ID: <a href="mailto:${toEmail}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${toEmail}</a></div>
              <div style="color: #cbd5e1;">Password: <strong style="color: #38bdf8; font-family: monospace; font-size: 15px; background: rgba(56, 189, 248, 0.15); padding: 2px 6px; border-radius: 4px;">${passwordDisplay}</strong></div>
              <div style="color: #cbd5e1;">Software: <strong style="color: #ffffff;">KT Construct Construction ERP</strong></div>
            </div>
          </div>

          <!-- Plan Details Box -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">
              Plan Details:
            </div>
            <div style="background: #1e293b; border-radius: 12px; padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); font-size: 14px; line-height: 1.8;">
              <div style="color: #cbd5e1;">Plan: <strong style="color: #ffffff;">${planName}</strong></div>
              <div style="color: #cbd5e1;">Price: <strong style="color: #4ade80;">₹${formattedPrice}</strong></div>
              <div style="color: #cbd5e1;">Duration: <strong style="color: #ffffff;">${duration}</strong></div>
              <div style="color: #cbd5e1;">Start Date: <strong style="color: #ffffff;">${startFormatted}</strong></div>
              <div style="color: #cbd5e1;">Expiry Date: <strong style="color: #fbbf24;">${expiryFormatted}</strong></div>
            </div>
          </div>

          <!-- Included Features Card (Matching Screenshot 1) -->
          <div style="background: #182234; border: 1.5px solid rgba(59, 130, 246, 0.3); border-radius: 14px; padding: 16px 18px; margin-bottom: 26px;">
            <div style="font-weight: 800; font-size: 13.5px; color: #ffffff; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              Included Features in KT Construct Portal:
            </div>
            <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #94a3b8; line-height: 1.8;">
              <li><strong style="color: #cbd5e1;">Project & Daily Logs:</strong> Site Inspection & Daily Logs</li>
              <li><strong style="color: #cbd5e1;">Crew & Subcontractor Hub:</strong> Work orders, attendance, RFQs</li>
              <li><strong style="color: #cbd5e1;">Cost Control ERP:</strong> Invoicing, Purchase Orders, Budget Tracker</li>
              <li><strong style="color: #cbd5e1;">Blueprint & Task Center:</strong> Real-time milestone tracker</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 26px 0 16px 0;">
            <a href="${appLoginUrl}" style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4); letter-spacing: 0.3px;">
              Login to Your Dashboard →
            </a>
          </div>

          <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 14px;">
            For security, please change your password upon your initial login.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid rgba(255,255,255,0.08); background: #0b1120; padding: 16px 24px; font-size: 11.5px; color: #64748b; text-align: center;">
          Kiaan Technology Pvt Ltd • KT Construct ERP • Official Automated Notification
        </div>
      </div>
    </body>
    </html>
  `;

  const userResult = await sendEmail({
    toEmail,
    toName: displayName,
    subject: `Welcome to KT Construct - Your Account is Ready (${planName})`,
    htmlContent: html,
  });

  // Copy Admin Notification
  const supportEmail = process.env.SUPPORT_NOTIFICATION_EMAIL || 'support@kiaantechnology.com';
  if (supportEmail && supportEmail !== toEmail) {
    sendEmail({
      toEmail: supportEmail,
      toName: 'Admin Alert',
      subject: `[New Subscription Alert] ${displayName} (${planName})`,
      htmlContent: html,
    }).catch(err => console.error('[EmailService] Admin copy error:', err.message));
  }

  return userResult;
}

/**
 * 2. Payment Confirmation & Subscription Receipt Email
 */
async function sendPaymentSuccessEmail({
  toEmail,
  companyName,
  planName,
  amount,
  orderId,
  paymentId,
  expiryDate,
}) {
  const formattedAmount = (amount / 100).toFixed(2);
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 30px 12px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 24px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Payment Successful ✅</h2>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">KT Construct Subscription Confirmed</div>
        </div>
        <div style="padding: 24px 26px; line-height: 1.6; font-size: 13px; color: #334155;">
          <p style="margin: 0 0 12px 0;">Hello <strong>${companyName || 'Valued Customer'}</strong>,</p>
          <p style="margin: 0 0 16px 0;">We have successfully received your payment for the <strong>${planName}</strong> plan.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">Amount Paid:</span>
              <strong style="color: #0f172a;">₹${formattedAmount} INR</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">Razorpay Payment ID:</span>
              <strong style="color: #0f172a; font-family: monospace;">${paymentId}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">Order ID:</span>
              <strong style="color: #0f172a; font-family: monospace;">${orderId}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Valid Until:</span>
              <strong style="color: #10b981;">${expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB') : 'Active'}</strong>
            </div>
          </div>

          <p style="margin: 0; color: #64748b;">Thank you for choosing Kiaan Technology.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName: companyName,
    subject: `Payment Receipt: ${planName} Plan Activated (KT Construct)`,
    htmlContent: html,
  });
}

/**
 * 3. Account Approval Email (Super Admin Approval)
 */
async function sendAccountApprovalEmail({ toEmail, companyName, loginUrl }) {
  const appLoginUrl = loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 30px 12px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #155dff; padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Your Account is Approved! 🎉</h2>
        </div>
        <div style="padding: 24px 26px; font-size: 14px; color: #334155; line-height: 1.6;">
          <p>Hello <strong>${companyName}</strong>,</p>
          <p>Great news! Your company account has been reviewed and approved by the Super Administrator.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appLoginUrl}" style="background: #155dff; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; display: inline-block;">
              Login to Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName: companyName,
    subject: `Account Approved - Welcome to KT Construct`,
    htmlContent: html,
  });
}

/**
 * 4. Password Reset Email
 */
async function sendPasswordResetEmail({ toEmail, toName, resetUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 24px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
        <p>Hello ${toName || 'User'},</p>
        <p>You requested a password reset for your KT Construct account. Click below to choose a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #155dff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Reset Your KT Construct Password`,
    htmlContent: html,
  });
}

/**
 * 5. General Admin Notification
 */
async function sendAdminNotificationEmail({ title, message, meta }) {
  const adminEmail = process.env.SUPPORT_NOTIFICATION_EMAIL || 'support@kiaantechnology.com';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h3>[Admin Alert] ${title}</h3>
      <p>${message}</p>
      ${meta ? `<pre style="background: #f1f5f9; padding: 10px; border-radius: 6px;">${JSON.stringify(meta, null, 2)}</pre>` : ''}
    </div>
  `;

  return sendEmail({
    toEmail: adminEmail,
    toName: 'Admin Alert',
    subject: `[Admin Alert] ${title}`,
    htmlContent: html,
  });
}

module.exports = {
  sendEmail,
  sendSubscriptionWelcomeEmail,
  sendPaymentSuccessEmail,
  sendAccountApprovalEmail,
  sendPasswordResetEmail,
  sendAdminNotificationEmail,
};
