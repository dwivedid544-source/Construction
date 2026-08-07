# Kiaan ERP SaaS — Production Deployment & Launch Guide

This guide provides end-to-end instructions for deploying the Kiaan ERP SaaS platform in production using Docker Compose, PostgreSQL 16, Prisma ORM, Nginx, and PM2.

---

## 1. Prerequisites

- **Host Server**: Ubuntu 22.04 LTS (or Debian 12 / AWS EC2 / DigitalOcean Droplet) with 4GB+ RAM.
- **Tools**: Docker, Docker Compose, Git, Node.js 20 LTS.
- **Domain & SSL**: A registered domain pointing to your server IP (`kaal.ca`).

---

## 2. Environment Setup

Create `.env` in the backend root:

```env
NODE_ENV="production"
PORT=4000

# PostgreSQL Connection
DATABASE_URL="postgresql://postgres:Dhruv%4023%2311dwivedi%212004@localhost:5433/kiaan_erp"
DB_DRIVER="prisma"

# Authentication & Security
JWT_SECRET="kaal_construction_management_secret_key_2026"

# Razorpay Integration
RAZORPAY_KEY_ID="rzp_test_TMRyc8lDjomNTV"
RAZORPAY_KEY_SECRET="FPXPcsktrhUnwUmdplF2Z9A4"
```

---

## 3. Deployment Methods

### Option A: Docker Compose Deployment (Recommended)

Run the entire stack (PostgreSQL + API + Nginx) via Docker:

```bash
# 1. Build and launch services
docker-compose up -d --build

# 2. Apply Prisma database migrations inside backend container
docker exec -it kiaan_backend npx prisma migrate deploy

# 3. Verify health status
curl http://localhost:4000/health
```

### Option B: Bare-Metal PM2 + Nginx Deployment

If running directly on the host server:

```bash
# 1. Install dependencies & generate Prisma client
npm ci --only=production
npx prisma generate
npx prisma migrate deploy

# 2. Launch with PM2 in Cluster Mode
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 4. Automated Backup Strategy

Set up a daily PostgreSQL database backup cron job:

```bash
# Open crontab
crontab -e

# Add daily 2 AM backup task
0 2 * * * pg_dump -U postgres -h localhost -p 5433 kiaan_erp | gzip > /var/backups/kiaan_erp_$(date +\%Y\%m\%d).sql.gz
```

---

## 5. System Verification Checklist

- [x] Liveness Probe: `curl http://localhost/health` returns HTTP 200 `UP`
- [x] Database Connection: PostgreSQL active on port 5433 via Prisma Client
- [x] Rate Limiter: Brute-force protection enabled on `/api/auth`
- [x] Multi-Tenancy: Company isolation verified via `tenantMiddleware.js`
