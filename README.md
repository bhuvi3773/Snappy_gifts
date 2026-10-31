# Snappy Gifts 🎁

Premier B2C & B2B corporate gifting e-commerce platform offering customized laser-engraved keepsakes, luxury gift hampers, festive collections, multi-address corporate CSV dispatch, and GST-compliant invoicing.

---

## 🌟 Architecture & Status Overview

- **Current Repository Baseline:** Client-side React 19 + TypeScript + Vite 8 Single-Page Application (SPA) with Tailwind CSS v4 and in-memory mock data.
- **Target Architecture (Master Plan):** Next.js App Router (SSR & Dynamic SEO Metadata), PostgreSQL 16+, Prisma ORM, Auth.js (RBAC), Server-Side Integer Paise Pricing, Razorpay Payment Gateway, and Transactional Email/PDF generation.
- **Build Methodology:** Strict batch-by-batch execution (Batches 0–12). One batch = one feature branch.
- **Current Progress:** **Batch 0 (Repository Audit & Development Foundation) Complete.**

For detailed architecture, data models, requirements, decisions, and go-live runbooks, consult the `docs/` directory:
- [Repository Audit](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/REPOSITORY_AUDIT.md)
- [Master Project Plan](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/PROJECT_PLAN.md)
- [Requirements Traceability Checklist](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/REQUIREMENTS_CHECKLIST.md)
- [Relational Data Model](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/DATA_MODEL.md)
- [Architecture Decisions Log](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/DECISIONS.md)
- [Go-Live Operational Runbook](file:///c:/Web_Templates/Snappy_Gifts/giftseccomerce-website/docs/GO_LIVE_RUNBOOK.md)

---

## 🚀 Getting Started (Clean Clone Setup)

### 1. Prerequisites
- **Node.js**: v18+ (tested with v24.13.0 LTS)
- **Package Manager**: `npm` (v10+; standardized on npm)
- **Docker & Docker Compose** (Optional for local PostgreSQL & Mailpit services)

### 2. Installation
Clone the repository and install dependencies using the clean lockfile:
```bash
npm ci
```

### 3. Environment Configuration
Copy the safe example environment template:
```bash
cp .env.example .env.local
```
Configure your local ports and database settings in `.env.local`. Never commit `.env` or secrets to version control.

### 4. Local Database & Mailpit Services (Docker)
If Docker is installed on your local machine, start PostgreSQL 16 and Mailpit:
```bash
docker compose up -d
```
- **PostgreSQL**: `localhost:5432` (`snappy_user` / `snappy_dev_password_only` / `snappy_gifts_db`)
- **Mailpit Web UI**: [http://localhost:8025](http://localhost:8025)
- **Mailpit SMTP**: `localhost:1025`

*(Note: If Docker is unavailable on your system, local mock adapters continue to function for UI testing).*

### 5. Running the Application Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Verification & Quality Scripts

Run baseline type-checking, linting, tests, and production build:

```bash
# Type-check TypeScript codebase
npm run typecheck

# Lint codebase (TypeScript no-emit check)
npm run lint

# Run automated tests
npm test

# Build production client bundle
npm run build
```

---

## 🔒 Scope & Security Rules

1. **Brand Identity:** Configured as **Snappy Gifts**. Legacy prototype branding ("Ajmer Gift Charm") is scheduled for phased replacement across UI templates.
2. **Monetary Precision:** All prices, taxes, discounts, and totals are computed strictly in **integer paise** (`1 INR = 100 paise`).
3. **No Unapproved Additions:** Promo coupons are deferred. Dealer portal and wholesale MRP pricing require signed change control. WhatsApp widgets and SMS integrations are excluded under the active SOW.
4. **Zero Secrets in Git:** All secrets remain strictly server-side and environment-injected.
