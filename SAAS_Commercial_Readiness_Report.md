# Commercial SaaS Production Readiness Report & Launch Roadmap
**Project:** KT Construct — Master Hub SaaS (Construction Management Platform)  
**Company:** Kiaan Technology Private Limited  
**Date:** August 2026  
**Document Version:** 1.0.0  

---

## 1. Executive Summary

KT Construct is an enterprise multi-tenant Construction Management SaaS platform designed for general contractors, project managers, site engineers, and subcontractors. The application features a modern high-converting landing page, multi-tier pricing models (Free Trial, Starter ₹599, Standard ₹799, Pro ₹1,299), RazorPay checkout integration, dual-driver database compatibility (Mongoose/MongoDB & Prisma), and multi-role dashboard controls (Super Admin, Company Admin, Project Team, Subcontractor, Client).

This document serves as the **Master Production & Commercial Audit Report**. It details the current state of the platform, completed features, and the definitive step-by-step technical requirements needed to make this SaaS platform **100% commercially ready and deployment-viable** for active paying customers.

---

## 2. Current Architecture & Completed Features

### 2.1 Accomplished Core Modules
- **Landing Page & Branding:**
  - Modern dark-mode UI with dynamic counters, features showcase, and mobile responsiveness.
  - Interactive **Privacy Policy** and **Terms & Conditions** modal popups with official Kiaan Technology Pvt Ltd credentials, DPDP Act 2023, and IT Act compliance.
  - Direct redirection of landing page "Login" CTA to the **Pricing Plans** section.
  - Functional social links in footer (Instagram, LinkedIn, YouTube, Official Website).

- **Billing & Checkout:**
  - RazorPay SDK integration (`VITE_RAZORPAY_KEY_ID`).
  - Seamless ₹0 Free 7-Day Trial routing directly to company registration with automated trial tracking and countdown warning banner.

- **Backend Architecture & Database Adaptability:**
  - **Prisma & Mongoose Dual Adapter:** A custom proxy bridge (`config/prisma.js`) supporting seamless Prisma API calls backed by MongoDB/Mongoose.
  - RESTful APIs covering auth, company onboarding, project management, BOQ, daily site logs, RFIs, purchase orders, equipment tracking, and reporting.

- **Authentication & Security:**
  - JWT authentication with multi-tenant company isolation (`companyId` scoping across models).
  - Strict 10-digit mobile number validation and company-level access controls.

---

## 3. Mandatory Commercial Pre-Launch Requirements

To transition from local/staging development to a enterprise commercial SaaS, the following critical engineering items must be completed:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMMERCIAL PRODUCTION LAUNCH PIPELINE                          │
├──────────────────────┬──────────────────────┬───────────────────┬──────────────────────┤
│ 1. Database Infrastructure│ 2. Payment Gateway   │ 3. Email & Auth   │ 4. SSL, Domain & CORS │
│    - Managed MongoDB Atlas│    - Production Keys │    - SMTP/SendGrid│    - Custom Domain   │
│    - Automated Backups   │    - Webhooks        │    - Password Reset│    - SSL Certificates│
│    - Indexing            │    - Tax Invoicing   │    - Email Verification│ - Security Hardening│
└──────────────────────┴──────────────────────┴───────────────────┴──────────────────────┘
```

### 3.1 Production Database Setup (Managed Cluster & Data Integrity)
- [ ] **Provision Dedicated Managed DB:** Deploy MongoDB Atlas (M10+ cluster) or AWS RDS PostgreSQL for production workloads with auto-scaling storage.
- [ ] **Connection Pooling & SSL:** Enforce `DB_DRIVER=mongoose` or `DB_DRIVER=prisma` with encrypted TLS (`mongodb+srv://`) and pooled connection limits.
- [ ] **Automated Backup Strategy:** Set up daily snapshots with 30-day point-in-time recovery (PITR).
- [ ] **Database Indexing:** Ensure indices are set for high-traffic fields (`companyId`, `email`, `createdAt`, `projectId`).

### 3.2 Production RazorPay & Billing Lifecycle Engine
- [ ] **Live Credentials Switch:** Replace test key `rzp_test_TMRyc8lDjomNTV` with production API Key & Secret (`rzp_live_...`) stored securely in production `.env`.
- [ ] **RazorPay Webhook Handler (`/api/webhooks/razorpay`):**
  - Implement HMAC SHA256 signature verification (`x-razorpay-signature`).
  - Handle background payment events: `payment.captured`, `subscription.charged`, `payment.failed`.
  - Automatically update `Company.subscriptionStatus`, `subscriptionPlanId`, and `trialEndsAt`.
- [ ] **Automated GST & Tax Invoice Generation:** Integrate PDF invoice rendering (e.g., `pdfkit` / `puppeteer`) sent via email on every successful payment.
- [ ] **Subscription Expiry Lockout Middleware:** Enforce automated account degradation or read-only mode once the 7-day trial or monthly plan expires without payment.

### 3.3 Domain, Deployment & Infrastructure Setup
- [ ] **Frontend Hosting:** Deploy React SPA to Vercel, Netlify, or AWS CloudFront + S3 with custom domain (`app.kiaantechnology.com` / `construct.kiaantechnology.com`).
- [ ] **Backend Hosting:** Deploy Express Node.js server to AWS EC2 / Render / DigitalOcean App Platform with PM2 cluster mode or Docker containers.
- [ ] **SSL & CORS Hardening:**
  - Enforce HTTPS via Let's Encrypt / AWS ACM.
  - Restrict CORS origins in Node.js backend to allow only production frontend domain.
- [ ] **Environment Configuration Audit:** Keep `.env.production` separate from local setup.

### 3.4 Email & Notification Infrastructure
- [ ] **SMTP / Transactional Email Provider:** Configure SendGrid, AWS SES, or Resend API for reliable inbox delivery.
- [ ] **Email Workflows:**
  - Welcome & Onboarding Email upon company registration.
  - Password Reset / Magic Link OTP verification.
  - Payment Receipts & Subscription Renewal Warnings (3 days prior to billing).
  - Daily Site Log summary notifications for Site Engineers.

---

## 4. Key Functional Modules Status & Production Roadmap

| Module | Current Status | Commercial Readiness Action Required | Priority |
| :--- | :--- | :--- | :---: |
| **Landing Page & Legal** | ✅ 95% Complete | Connect newsletter submission form to CRM / DB. | Low |
| **RazorPay Payments** | 🟡 Staging / Test | Implement live webhook verification & automated invoice PDF generation. | **CRITICAL** |
| **Auth & Registration** | ✅ 90% Complete | Add Email Verification link & Forgot Password flow. | **HIGH** |
| **Super Admin Portal** | 🟡 70% Complete | Add SaaS Metrics dashboard (MRR, ARR, Churn, Active Tenants) & Manual Subscription Override. | **HIGH** |
| **Company Admin Portal** | 🟡 80% Complete | Add GST / Billing details form, invoice download history, and user seat limits. | **HIGH** |
| **Project & Site Logs** | 🟡 85% Complete | Enable image upload compression for site photos (AWS S3 bucket setup). | Medium |
| **RFIs & Purchase Orders**| 🟡 80% Complete | Digital signature / approval workflow for high-value POs. | Medium |
| **Subcontractor Portal** | 🟡 75% Complete | Mobile responsiveness audit and offline log caching support. | Medium |

---

## 5. Security, Compliance & Performance Hardening

### 5.1 Security Audit Checklist
1. **JWT Hardening:**
   - Use strong RSA-256 or 64-byte random string for `JWT_SECRET`.
   - Implement Short-Lived Access Tokens (15-30 mins) + HTTP-Only Secure Refresh Tokens.
2. **Rate Limiting & Anti-Abuse:**
   - Integrate `express-rate-limit` on `/api/auth/login` and `/api/auth/register` to prevent brute-force attacks.
   - Implement `helmet` for HTTP security headers (X-Frame-Options, CSP, HSTS).
3. **Data Sanitization & Injection Defense:**
   - Sanitize request inputs against XSS (`xss-clean`) and NoSQL/SQL injection (`express-mongo-sanitize`).
4. **Legal & Privacy Compliance:**
   - Enforce explicit checkbox consent for Privacy Policy & Terms of Conditions during company registration.
   - Implement account deletion / data export under DPDP Act 2023 / GDPR.

### 5.2 Performance Optimization
1. **Media & Photo Storage:** Route construction site photos directly to AWS S3 / Cloudflare R2 using presigned URLs rather than storing base64 strings or local disk.
2. **Database Query Optimization:** Add Redis caching layer for slow-changing reference data (plans, system settings, dropdown lists).
3. **Frontend Bundle Optimization:** Implement code splitting / lazy loading for heavy chart libraries (`recharts`, `lucide-react`) to keep initial bundle size under 300KB.

---

## 6. Actionable Release Checklist (Pre-Launch Protocol)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          COMMERCIAL LAUNCH CHECKLIST                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [ ] Step 1: AWS/Atlas Production Database Provisioning                          │
│ [ ] Step 2: Live RazorPay API Key Integration & Webhook Listener               │
│ [ ] Step 3: SendGrid / AWS SES Transactional Email Setup                        │
│ [ ] Step 4: AWS S3 Presigned Uploads for Site Photos & Blueprints               │
│ [ ] Step 5: Domain Name & SSL Certificate Configuration                         │
│ [ ] Step 6: End-to-End Penetration & Security Testing                           │
│ [ ] Step 7: Final End-User Acceptance Testing across 5 Key Roles                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Sign-off & Next Steps

This project has reached a high level of functional maturity with its core UI, API adapters, landing page, and authentication structures. Executing the mandatory pre-launch items listed in Section 3 and Section 5 will transform KT Construct into a secure, scalable, and revenue-generating commercial SaaS platform.

*Prepared by Antigravity AI Engineering Team for Kiaan Technology Private Limited.*
