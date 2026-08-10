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
 * 1. Welcome & Onboarding Email for New Registration
 */
async function sendWelcomeEmail({ toEmail, toName, companyName, planName, expiryDate, loginUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #155dff; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.02em;">Welcome to Kiaan Technology</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="margin-top: 0; color: #0f172a;">Hello ${toName || 'User'},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Your account for <strong>${companyName || 'KT Construct'}</strong> has been successfully registered!
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Selected Plan:</strong> ${planName || 'Standard'}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Registered Email:</strong> ${toEmail}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Subscription Expiry:</strong> ${expiryDate || 'Active'}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl || 'http://localhost:5173/login'}" style="background: #155dff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
              Access Portal
            </a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt-20px; margin-top: 30px; text-align: center;">
            Thank you for choosing Kiaan Technology Pvt Ltd. Need help? Contact support anytime.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: `Welcome to Kiaan Technology — ${companyName || 'KT Construct'}`,
    htmlContent: html,
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
}) {
  const formattedPrice = typeof price === 'number' ? price.toFixed(2) : (String(price).replace(/[^0-9.]/g, '') || '1.00');
  const appLoginUrl = loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #fdf2f8; padding: 20px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        
        <!-- Header Banner matching Screenshot 2 -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 28px; color: #ffffff;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; margin-bottom: 4px;">
            ⚡ KT Construct
          </div>
          <div style="font-size: 11px; opacity: 0.85; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
            Official Notification
          </div>
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.3;">
            Welcome to KT Construct - Your Account is Ready
          </h2>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 28px; line-height: 1.6; font-size: 14px; color: #334155;">
          <p style="margin: 0 0 10px 0;">Hello <strong>${companyName || 'Valued Customer'}</strong> ,</p>
          <p style="margin: 0 0 10px 0;">Welcome to KT Construct .</p>
          <p style="margin: 0 0 20px 0;">Your account and plan subscription have been successfully activated.</p>

          <!-- Account Details Section -->
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #1e293b;">Account Details:</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Name: ${companyName || 'KT Construct Member'}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Email / Login ID: <a href="mailto:${toEmail}" style="color: #2563eb; text-decoration: none;">${toEmail}</a></p>
            <p style="margin: 0 0 4px 0; color: #475569;">Password: ${plainPassword || '******'}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Software: KT Construct</p>
          </div>

          <!-- Plan Details Section -->
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #1e293b;">Plan Details:</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Plan: ${planName}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Price: ₹${formattedPrice}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Duration: ${duration}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Start Date: ${startDate || new Date().toLocaleDateString('en-GB')}</p>
            <p style="margin: 0 0 4px 0; color: #475569;">Expiry Date: ${expiryDate || '30 Days Active'}</p>
          </div>

          <!-- Login Link -->
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; color: #1e293b;">Login:</p>
            <a href="${appLoginUrl}" style="color: #2563eb; font-size: 14px; text-decoration: underline; word-break: break-all;">
              ${appLoginUrl}
            </a>
          </div>

          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">Please keep your login credentials secure.</p>
          
          <p style="margin: 0; color: #334155;">Thank you,</p>
          <p style="margin: 2px 0 20px 0; font-weight: bold; color: #0f172a;">Kiaan Technology Pvt Ltd</p>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
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

