# 🏗️ KT Construct (Construction SaaS ERP) — Complete System Architecture & Workflow Specification

This document provides a comprehensive technical overview of the **KT Construct SaaS Platform**, detailing how all dashboards, user roles, backend microservices, database schemas, payment gateways, and email dispatches are interconnected.

---

## 1. System Architecture & Tech Stack Overview

- **Frontend Architecture**: React 18, Vite, TailwindCSS, Lucide Icons, Socket.io-client (Real-time updates), Axios (REST API client).
- **Backend Architecture**: Node.js, Express.js (REST APIs), Prisma ORM, PostgreSQL Database (`kiaan_erp`), WebSockets (Socket.io).
- **Third-Party Integrations**:
  - **Razorpay API**: Automated payment orders, HMAC signature verification, live payment status checks.
  - **Brevo API (Sendinblue)**: Transactional email dispatches for welcome emails, password resets, and subscription invoices.
- **Tenant Security & Isolation**: Multi-tenant database architecture with `companyId` scoping, Role-Based Access Control (RBAC), and plan limit enforcement middleware (`checkPlanLimits.js`).

---

## 2. Dashboard Interconnections & Role Hierarchies

```
                                  ┌───────────────────────────────┐
                                  │    Super Admin Dashboard      │
                                  │        (Platform Root)        │
                                  └───────────────┬───────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
   ┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
   │  Companies & Payments   │       │ Subscriptions & Plans   │       │  Global Users & Logs    │
   │  (Payment Invoices/PDF) │       │ (Live Landing Page Sync)│       │  (Audit & Security)     │
   └─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │    Public Landing Page        │
                                  │   (Live Pricing & Razorpay)   │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │  Company Admin Tenant Portal  │
                                  │   (Company Level Dashboard)   │
                                  └───────────────┬───────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
   ┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
   │ Project Manager Portal  │       │  Subcontractor Portal   │       │   Client / Owner Portal │
   │ (Daily Site Logs & POs) │       │   (Bidding & Invoices)  │       │   (Read-Only Progress)  │
   └─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

### 👑 A. Super Admin Dashboard (`/super-admin`) — Platform Root
The Super Admin dashboard has global oversight across all registered construction companies, users, subscriptions, and platform revenues.

#### Connected Pages & Modules:
1. **Overview Dashboard (`/super-admin`)**:
   - **Metrics**: Total Companies, Active Subscribers, Total Platform Revenue, Active Users Count, System Logs.
   - **Real-Time Activity Feed**: Live tenant signups, payment verification alerts, audit trails.

2. **Companies & Payments Management (`/super-admin/companies`)**:
   - **Revenue & Payment KPI Cards**: Total Revenue (₹), Success Rate %, Failed Transactions count.
   - **Filter & Search**: Tabs for `All Payments`, `Success`, `Pending`, `Failed` + Search bar by Transaction ID / Company name.
   - **Data Table Columns**: Checkbox, Payment ID (`PAY-2026...`), Date, Customer/Company Name, Payment Method, Amount, Status Pill Badge.
   - **Action Triggers**:
     - 📄 **PDF / Invoice**: Generates & prints official KT Construct PDF Payment Invoice.
     - 👁️ **View Details**: Opens company metadata, contact info, seats, and project counts.
     - ✏️ **Edit Company**: Modifies company name, email, phone, plan type, or password.
     - 🗑️ **Delete Company**: Soft-deletes company; immediately frees up email & mobile phone for re-testing.

3. **Subscriptions & Pricing Plans (`/super-admin/subscriptions`)**:
   - **Active Subscription Stats**: Monthly Subscribers, Pending Approval, Past Due, Total Companies.
   - **Pricing Plans & Features Grid**: Live management of all SaaS pricing tiers (`Free Try Now 7 Days`, `Starter 1`, `Standard 799`, `Pro 1299`).
   - **Action Triggers**:
     - ➕ **Add New Plan**: Creates a new pricing tier with custom limits & features.
     - 👁️ **View Plan**: Displays max projects, max users, price, period, and features.
     - ✏️ **Edit Plan**: Modifies name, price, period, max users, max projects, feature bullet points, or popular badge.
     - 🗑️ **Delete Plan**: Removes pricing plan from the platform.
   - **Direct Sync**: Any edits in Super Admin immediately update the **Public Landing Page** live!

4. **Revenue Tracking (`/super-admin/revenue`)**:
   - Historical revenue analytics, Razorpay transaction breakdowns, Monthly Recurring Revenue (MRR).

5. **Global Users (`/super-admin/users`)**:
   - Cross-tenant user search, role modification (SUPER_ADMIN, COMPANY_ADMIN, PROJECT_MANAGER, ENGINEER, WORKER), account activation/deactivation.

6. **System Logs & Audit (`/super-admin/logs`)**:
   - Immutable audit trail recording user logins, payment events, company creation, plan modifications, and system errors.

7. **Settings (`/super-admin/settings`)**:
   - Razorpay API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), Brevo SMTP credentials, system default limits.

---

### 🏢 B. Company Admin / Owner Dashboard (`/dashboard`) — Tenant Level
Each registered construction company operates inside an isolated tenant portal.

#### Connected Pages & Modules:
1. **Tenant Main Dashboard (`/dashboard`)**:
   - Active Construction Sites, Total Labor & Worker Attendance, Expense Summary, PO Approval Alerts, Weather & Daily Site Feed.
2. **Project Management (`/projects`)**:
   - Add/edit construction sites. Strictly checked against active plan limit `maxProjects` via `checkProjectLimit` middleware.
3. **Team & Employee Management (`/users`)**:
   - Invite site engineers, supervisors, and workers. Strictly checked against active plan limit `maxUsers` via `checkUserLimit` middleware.
4. **Site Logs & Attendance (`/site-logs`)**:
   - Crew clock-in/out, GPS geofencing, daily progress photos, site activity logs.
5. **Subcontractor & Bidding Hub (`/subcontractors`)**:
   - Send RFQs to subcontractors, compare bids, issue digital work orders.
6. **Purchase Orders & Invoicing (`/purchase-orders`)**:
   - Create POs for materials, vendor invoice approval, cost tracking.
7. **Document & Blueprint Vault (`/documents`)**:
   - Upload site blueprints, CAD files, RFIs, inspection reports.
8. **Company Billing (`/settings/billing`)**:
   - Current plan display, renewal date, upgrade plan trigger.

---

### 👷 C. Project Manager & Site Engineer Dashboard
- **Scope**: Field operations for assigned construction sites.
- **Connected Modules**: Daily Site Logs, Labor Attendance Check-in, Material Requests, Quality Checklists, Issue Reporting.

---

### 👷‍♂️ D. Subcontractor & Vendor Portal
- **Scope**: Bidding and progress billing.
- **Connected Modules**: RFQ Responses, Work Order Status, Invoice Submissions.

---

### 👤 E. Client / Owner Portal
- **Scope**: Read-only site progress tracking.
- **Connected Modules**: Milestone Progress, Live Site Photos, Blueprint Viewer, RFI Status.

---

## 3. End-to-End System Workflows

### 🔄 Workflow 1: Public Subscription Signup & Payment Verification

```
[Public Visitor] ──► [Selects Plan on Landing Page]
                           │
                           ▼
             [Fills Company & Account Details]
                           │
                           ▼
          [Backend Pre-Check Eligibility Call] ──► (Is Email or Phone Already Registered?)
                           │                                  │
                           │ Yes                              │ No
                           ▼                                  ▼
               [Block Razorpay Modal &]            [Open Razorpay Payment Modal]
              [Show Ineligible Alert]                         │
                                                              ▼
                                                   [User Pays ₹1 / Plan Price]
                                                              │
                                                              ▼
                                                  [Backend HMAC & API Verification]
                                                              │
                                                              ▼
                                                  [Create Company & User Account]
                                                              │
                                                              ▼
                                                  [Send KT Construct Welcome Email]
                                                              │
                                                              ▼
                                                  [Redirect to Tenant Dashboard]
```

1. **Pre-Payment Eligibility Check**:
   - Customer clicks "Proceed to Payment (Razorpay)" on Landing Page.
   - Frontend calls `POST /api/auth/check-subscription-eligibility` **BEFORE** loading Razorpay SDK.
   - If `email` or `phoneNumber` has already claimed the 1-time ₹1 Starter offer (and `deletedAt: null`), backend returns 400 Bad Request and **Razorpay modal NEVER opens** (₹0 deducted).
2. **Payment Processing**:
   - If eligible, Razorpay SDK modal opens and collects payment.
3. **Backend HMAC & Razorpay REST API Verification**:
   - Frontend sends `paymentId`, `razorpayOrderId`, `razorpaySignature` to `POST /api/auth/register-subscription`.
   - `BillingService.verifyRazorpayPayment` calculates HMAC signature and queries Razorpay REST API `GET /v1/payments/:id`.
4. **Account & Company Provisioning**:
   - Atomic DB transaction sets `SubscriptionOrder` status to `PAID`, creates `Company` and `User` records.
5. **Branded Welcome Email Dispatch**:
   - `emailService.sendSubscriptionWelcomeEmail` sends responsive HTML email via Brevo API with **KT Construct** branding, account credentials, plan price, start/expiry dates, and support details.

---

### 🔄 Workflow 2: Super Admin Plan Modifications & Live Landing Page Sync

1. **Super Admin Edit**: Super Admin edits plan name, price, period, or features in `/super-admin/subscriptions`.
2. **Database Update**: Backend updates the `Plan` record in PostgreSQL (`kiaan_erp`).
3. **Live Landing Page Update**: `LandingPage.jsx` fetches `GET /api/plans` and dynamically updates the public pricing cards in real time.
4. **Limit Middleware Enforcement**: `checkPlanLimits.js` enforces `maxProjects` and `maxUsers` on all tenant APIs based on the updated plan limits.

---

### 🔄 Workflow 3: Account Deletion & Testing Reset

1. **Deletion**: Super Admin deletes a company or user in `/super-admin/companies` or `/super-admin/users`.
2. **Soft Delete Timestamp**: Backend sets `deletedAt: new Date()`.
3. **Instant Re-testing**: Eligibility queries check `where: { deletedAt: null }`. Deleting an account immediately frees up the `email` and `phoneNumber` so Super Admin or testers can register again with the same credentials.

---

## 4. Full Route & API Mapping Table

| Component / Feature | Frontend Route | Backend Endpoint | HTTP Method | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | `/` | `/api/plans` | GET | Public | Dynamic pricing plans display |
| **Pre-Check Eligibility** | Landing Modal | `/api/auth/check-subscription-eligibility` | POST | Public | Checks 1-time promo eligibility before charging money |
| **Register & Subscribe** | Landing Modal | `/api/auth/register-subscription` | POST | Public | Verifies Razorpay payment, creates tenant & dispatches email |
| **Login** | `/login` | `/api/auth/login` | POST | Public | User authentication & JWT token generation |
| **Super Admin Dashboard** | `/super-admin` | `/api/super-admin/stats` | GET | SUPER_ADMIN | Platform-wide KPI counters & summary |
| **Companies Management** | `/super-admin/companies` | `/api/companies` | GET, POST, PATCH, DELETE | SUPER_ADMIN | Tenant company CRUD, payment table & PDF invoice |
| **Subscriptions & Plans** | `/super-admin/subscriptions` | `/api/plans` | GET, POST, PATCH, DELETE | SUPER_ADMIN | Plan CRUD & live landing page sync |
| **Global Users** | `/super-admin/users` | `/api/users` | GET, PATCH, DELETE | SUPER_ADMIN | Cross-tenant user management |
| **System Logs** | `/super-admin/logs` | `/api/audit-logs` | GET | SUPER_ADMIN | Audit trail & log inspector |
| **Tenant Dashboard** | `/dashboard` | `/api/companies/dashboard/stats` | GET | Company User | Tenant site logs, labor & project overview |
| **Projects** | `/projects` | `/api/projects` | GET, POST, PATCH, DELETE | Company User | Construction sites (enforces `maxProjects`) |
| **Employees / Team** | `/users` | `/api/users` | GET, POST, PATCH, DELETE | Company User | Team members (enforces `maxUsers`) |

---

## 5. File Architecture Reference

- **Backend Server Entry**: `[BAckend/server.js](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/server.js)`
- **Prisma Schema**: `[BAckend/prisma/schema.prisma](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/prisma/schema.prisma)`
- **Auth & Eligibility Controller**: `[BAckend/controllers/authController.js](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/controllers/authController.js)`
- **Billing & Razorpay Verification**: `[BAckend/services/billingService.js](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/services/billingService.js)`
- **Email Automation**: `[BAckend/utils/emailService.js](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/utils/emailService.js)`
- **Plan Limits Middleware**: `[BAckend/middlewares/checkPlanLimits.js](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/BAckend/middlewares/checkPlanLimits.js)`
- **Super Admin Layout & Sidebar**: `[Frontend/src/layouts/SuperAdminLayout.jsx](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/Frontend/src/layouts/SuperAdminLayout.jsx)`
- **Super Admin Companies Page**: `[Frontend/src/pages/super-admin/Companies.jsx](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/Frontend/src/pages/super-admin/Companies.jsx)`
- **Super Admin Subscriptions Page**: `[Frontend/src/pages/super-admin/Subscriptions.jsx](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/Frontend/src/pages/super-admin/Subscriptions.jsx)`
- **Public Landing Page**: `[Frontend/src/pages/LandingPage.jsx](file:///c:/Users/HGP/Desktop/intern%20projects/SAAS_Const/Frontend/src/pages/LandingPage.jsx)`
