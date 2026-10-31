# Snappy Gifts — Master Project Plan & Execution Sequence

**Project:** Snappy Gifts E-Commerce Platform  
**Target Architecture:** Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js, Zod, Service Adapters, Mailpit, Vitest & Playwright  
**Current Baseline:** React 19 + TypeScript + Vite SPA  
**Specification Reference:** `Snappy Gifts – Master Build Plan.pdf` & `Snappy_Gifts_SOW.pdf`

---

## 1. Architecture Overview & Migration Strategy

### 1.1 Architectural Target
The platform is designed as a modular, type-safe monolithic e-commerce application serving both B2C individual retail customers and B2B enterprise corporate clients:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Storefront & Admin Web App                      │
│      Next.js 15+ App Router / React 19 / Tailwind CSS / Lucide         │
├────────────────────────────────────────────────────────────────────────┤
│                 Presentation & Interactive Experiences                  │
│   • Retail Catalog & Filter Engine        • Personalization Canvas     │
│   • Multi-address B2B CSV Dispatcher      • Admin & Ops Portal         │
├────────────────────────────────────────────────────────────────────────┤
│                      Server-Side Business Logic                        │
│   • Pricing & Tax Engine (Paise)          • Order State Machine        │
│   • Stock Reservation (Transactions)      • Role-Based Access Control  │
├────────────────────────────────────────────────────────────────────────┤
│                        Domain Service Adapters                         │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│   │   Payment    │ │    Email     │ │ File Storage │ │   Logistics  │  │
│   │ (Razorpay /  │ │  (Mailpit /  │ │   (Local /   │ │ (Delhivery / │  │
│   │    Mock)     │ │   Resend)    │ │     S3)      │ │   BlueDart)  │  │
│   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                      Persistence & Data Layer                          │
│          Prisma ORM Client  ───►  PostgreSQL 16 Relational DB          │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 The Vite to Next.js Migration Gate
The existing repository was developed as a Vite client-side SPA. However:
1. The **SOW mandates server-side rendering (SSR) and dynamic metadata** for product catalog SEO, open graph social sharing, and search indexing.
2. Robust security requires **server-executed pricing, secret storage, authenticated API endpoints, and raw-body payment webhook processing**, none of which can run safely inside a pure browser SPA.

**Recommended Migration Approach:**
- **Do not abruptly delete or discard the Vite app in Batch 0.**
- In Batch 0, establish the complete data model, documentation, local Docker environment, service adapters, and type definitions.
- When the architecture approval gate is granted by the user, execute a deliberate porting step: migrate the layout, header, footer, personalization studio, product card, cart drawer, and checkout components into Next.js App Router pages and Server Components/Client Components.

---

## 2. Non-Negotiable Architectural Rules

Every batch must adhere to these foundational engineering constraints:

1. **Integer Paise for Money:**
   All monetary amounts (prices, discounts, shipping, taxes, subtotals, grand totals, refunds) must be stored and computed as **integer paise** (`1 INR = 100 paise`). Floating-point arithmetic (`Math.round(val * 0.18)`) is strictly prohibited.
2. **Server-Side Pricing Authority:**
   The browser displays prices for presentation only. The server re-calculates product prices, customization surcharges, gift wrap, card fees, shipping rates, and taxes inside database transactions during checkout and payment intent creation.
3. **Payment State Separation:**
   `PaymentStatus` (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`) is tracked independently from `OrderStatus` (`PENDING`, `CONFIRMED`, `IN_CUSTOMIZATION`, `DISPATCHED`, `DELIVERED`, `CANCELLED`).
4. **Idempotent Webhook Processing:**
   Payment webhooks must be verified using the raw request body and gateway secret. Duplicate webhooks must be safely ignored without double-crediting or duplicate dispatch triggers. Gateway amounts must match the server order total exactly.
5. **Transactional Inventory & Order Placement:**
   Order creation, inventory decrement, and coupon application must execute within PostgreSQL transactions (`prisma.$transaction`) with guarded stock constraints.
6. **Immutable Historical Snapshots:**
   Line items snapshot product name, SKU, unit price paise, tax percentage, HSN code, and customization options at the exact moment of purchase so subsequent catalog updates never alter historical invoices.
7. **No Hard Deletes:**
   Soft-deletion (`isArchived`, `deletedAt`, status flags) is used for catalog items, customers, orders, and quotations to preserve audit trails and financial integrity.
8. **Server-Side Upload Security:**
   Uploaded customer logos and photos must be validated server-side by MIME type, file signature (magic bytes), and size limits. Files must be stored outside public web roots and accessed via signed URLs or guarded streaming endpoints.
9. **Zero Plaintext Secrets:**
   No secrets in Git, no secrets in chat, no secrets in browser bundles. All secrets live in `.env` (development) or hosting environment variables.
10. **Verified Status Reporting:**
    Tests and checks must never be reported as passing unless they actually ran and exited with code 0.

---

## 3. Full Batch Execution Roadmap (Batches 0 – 12)

### Batch 0 — Repository Audit & Development Foundation *(Accepted)*
- **Objective:** Audit existing code, establish documentation suite, verify baseline commands, configure local Docker Compose (PostgreSQL + Mailpit), draft Prisma schema in integer paise, configure adapter interfaces, and establish verification checks.
- **Dependencies:** None.
- **Deliverables:** `REPOSITORY_AUDIT.md`, `PROJECT_PLAN.md`, `REQUIREMENTS_CHECKLIST.md`, `DATA_MODEL.md`, `DECISIONS.md`, `GO_LIVE_RUNBOOK.md`, `docker-compose.yml`, `prisma/schema.prisma`, `src/config/env.ts`, `src/services/adapters/`.
- **Status:** **Accepted**.

### Batch 1 — Next.js Migration, Authentication & RBAC *(Completed & Verified)*
- **Objective:** Migrate from client-only Vite SPA to Next.js App Router. Implement secure server-side authentication (Email + Password with bcrypt & Email OTP single-use challenges with rate limits). Centralized server-side authorization guard (`requireRole`, `requireAuth`). Database session persistence with secure HTTP-only cookies. First-admin bootstrap CLI script.
- **Dependencies:** Batch 0 (Database schema, user entity).
- **Deliverables:** Next.js App Router (`src/app/layout.tsx`, `page.tsx`, `globals.css`, `not-found.tsx`, `error.tsx`), Auth routes (`/api/auth/register`, `login`, `logout`, `me`, `otp/send`, `otp/verify`), RBAC helpers (`src/lib/auth/rbac.ts`), Session manager (`src/lib/auth/session.ts`), Password hasher (`src/lib/auth/password.ts`), OTP validator (`src/lib/auth/otp.ts`), Auth modal UI (`src/components/AuthModal.tsx`), Bootstrap script (`scripts/bootstrap-admin.ts`), Automated test suite (`src/test/auth.test.ts`).
- **Status:** **Completed & Verified (19 automated tests passed, production build passed).**

### Batch 2 — Catalog Architecture & Admin Inventory *(Completed & Verified)*
- **Objective:** Relational catalog backed by PostgreSQL: categories, occasions, recipients, products, variants, SKUs, inventory stock tracking, and image assets. Admin CRUD for products and variants with audit logging.
- **Dependencies:** Batch 1 (Admin authentication).
- **Deliverables:** Product APIs (`/api/admin/catalog/products`, `[id]`, `variants`), category API (`/api/admin/catalog/categories`), image upload with magic bytes verification (`/api/admin/catalog/images/upload`), atomic stock adjustments (`/api/admin/catalog/inventory/adjust`), append-only inventory ledger (`InventoryAdjustment`), PostgreSQL migration artifact (`prisma/migrations/0_init/migration.sql`), and automated test suite (`src/test/catalog.test.ts`).
- **Status:** **Completed & Verified (25 catalog tests passed, 47 master tests passed, Next.js build passed 16/16 routes).**

### Batch 3 — Storefront, Search, Filter & SEO Metadata *(Completed & Verified)*
- **Objective:** Customer-facing public storefront with category and occasion filters, server-sanitized search query handling, sorting controls, product details page (`/products/[slug]`), responsive navigation, load-more pagination, dynamic SEO metadata, OpenGraph, JSON-LD Schema.org structured data, `robots.ts`, and `sitemap.ts`.
- **Dependencies:** Batch 2 (Catalog database).
- **Deliverables:** Public catalog service (`src/lib/catalog/public-catalog.service.ts`), public read-only API endpoints (`/api/catalog/products`, `/api/catalog/products/[slug]`, `/api/catalog/categories`, `/api/catalog/occasions`), dynamic product page (`src/app/products/[slug]/page.tsx`), search/filter/sort/pagination integration (`src/App.tsx`), Next.js robots (`src/app/robots.ts`) and sitemap (`src/app/sitemap.ts`), automated test suite (`src/test/storefront.test.ts`).
- **Status:** **Completed & Verified (27 storefront tests passed, 79 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO, Next.js production build passed 22/22 routes).**

### Batch 4 — Server-Side Pricing, Cart & Checkout Engine
- **Objective:** Build centralized pricing engine (`calculateCartPricing`) in integer paise. Support Indian pincode serviceability checks, address validation, tax calculation (CGST+SGST for intra-state Rajasthan vs IGST for inter-state), shipping thresholds, and transactional order creation with 15-minute stock reservation.
- **Dependencies:** Batch 2 (Catalog), Batch 3 (Storefront).
- **Deliverables:** Cart pricing calculation service (`src/lib/pricing/pricing.service.ts`), pincode validation and serviceability (`src/lib/shipping/pincode.service.ts`), transactional order creation service (`src/lib/orders/order.service.ts`), reservation release service (`src/lib/orders/reservation.service.ts`), privacy-safe order lookup service (`src/lib/orders/order-lookup.service.ts`), API endpoints (`/api/checkout/quote`, `/api/checkout/orders`, `/api/orders/[orderNumber]`, `/api/orders/lookup`, `/api/admin/orders/reservations/release`, `/api/shipping/pincode`), checkout modal UI integration (`src/components/CheckoutModal.tsx`), automated test suite (`src/test/checkout.test.ts`).
- **Status:** **Completed & Verified (20 checkout tests passed, 99 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing, Next.js production build passed 28/28 routes).**

### Batch 5 — Payments Engine & Webhook Reconciliation *(Completed & Verified)*
- **Objective:** Implement payment provider adapter: local Mock Payment Provider for automated tests and sandbox Razorpay integration. Server-side order creation (`razorpay.orders.create`), raw-body webhook signature verification, idempotent event logging, and pending-payment reconciliation cron.
- **Dependencies:** Batch 4 (Checkout & order entity).
- **Deliverables:** `PaymentAdapter` interface (`src/services/adapters/payment.adapter.ts`), `MockPaymentAdapter` (`src/lib/payments/mock.adapter.ts`), `RazorpayPaymentAdapter` (`src/lib/payments/razorpay.adapter.ts`), adapter factory with production fail-closed safety (`src/lib/payments/payment-factory.ts`), core payment & webhook service (`src/lib/payments/payment.service.ts`), API endpoints (`/api/payments/create-order`, `/api/payments/verify`, `/api/webhooks/razorpay`, `/api/admin/payments/reconciliations`), CheckoutModal Razorpay SDK integration (`src/components/CheckoutModal.tsx`), database migration (`prisma/migrations/20261029_batch5_payment_razorpay_reconciliation/migration.sql`), automated test suite (`src/test/payment.test.ts`).
- **Status:** **Completed & Verified (29 payment tests passed, 128 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway, Next.js production build passed 31/31 routes).**

### Batch 6 — Order Lifecycle, Fulfillment & Privacy-Safe Tracking *(Completed & Verified)*
- **Objective:** Robust order state machine (`PENDING` → `CONFIRMED` → `IN_CUSTOMIZATION` → `QUALITY_CHECK` → `DISPATCHED` → `DELIVERED`). Manual courier partner & AWB assignment with strict HTTP/HTTPS tracking URL validation. Customer tracking lookup requiring Order Number + Phone/Email match. Authenticated customer order history.
- **Dependencies:** Batch 5 (Paid orders).
- **Deliverables:** Order lifecycle service (`src/lib/orders/order-lifecycle.service.ts`), order lookup enhancements with shipment tracking (`src/lib/orders/order-lookup.service.ts`), admin API endpoints (`GET /api/admin/orders`, `GET /api/admin/orders/[id]`, `PATCH /api/admin/orders/[id]/status`, `POST /api/admin/orders/[id]/dispatch`, `POST /api/admin/orders/[id]/deliver`), customer order history endpoint (`GET /api/orders`), order tracking modal integration with external courier portal link (`src/components/OrderTrackingModal.tsx`), Prisma schema update and migration (`prisma/migrations/20261029_batch6_fulfillment_tracking/migration.sql`), automated test suite (`src/test/fulfillment.test.ts`).
- **Status:** **Completed & Verified (27 fulfillment tests passed, 155 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway + 27 Fulfillment & Tracking, Next.js production build passed 37/37 routes).**

### Batch 7 — Personalization Studio & Artwork Proof Pipeline *(Completed & Accepted)*
- **Objective:** Secure artwork upload pipeline stored privately (`storage/private/`, NOT in `public/uploads/`). Real-time client-side mockup preview with crop, zoom, and placement sliders. Authoritative server-side surcharge computation in integer paise overriding client price tampering. Transactional persistence of distinct rendered customer preview proof images (PNG binaries under `storage/private/proofs/`, isolated from raw source artwork). Unambiguous separation of customer consent (`customerApprovalStatus`, `customerApprovedAt`, `customerApprovedBy`) from staff artisan review (`staffReviewStatus`, `staffReviewedAt`, `staffReviewedBy`). Proof revision pipeline invalidating prior approvals. Explicitly configurable packaging surcharge (`WOODEN_CRATE_SURCHARGE_PAISE`). Automated and admin-invocable unattached artwork retention cleanup routine (`POST /api/admin/personalization/uploads/cleanup`).
- **Dependencies:** Batch 4 (Order item snapshots), Storage Service.
- **Deliverables:** Private storage service (`src/services/storage/private-storage.service.ts`), personalization service (`src/lib/personalization/personalization.service.ts`), proof payload validator (`src/lib/personalization/proof-validator.ts`), private upload API (`POST /api/personalization/upload`), authorized stream endpoint (`GET /api/personalization/uploads/[id]/file`), staff proof review endpoint (`PATCH /api/admin/personalization/proofs/[orderItemId]/review`), customer proof approval endpoint (`POST /api/orders/[orderNumber]/proofs/[orderItemId]/approve`), upload cleanup endpoint (`POST /api/admin/personalization/uploads/cleanup`), PersonalizationStudio UI enhancements with tabs, zoom/offset sliders, preset alignment buttons, and proof approval checkbox (`src/components/PersonalizationStudio.tsx`), Order tracking proof review and customer re-approval modal integration (`src/components/OrderTrackingModal.tsx`), Admin order details proof inspection and verification actions (`src/components/admin/AdminDashboard.tsx`), Prisma schema update and migration (`prisma/migrations/20261029_batch7_personalization_artwork_proofs/migration.sql`), automated test suite (`src/test/personalization.test.ts`).
- **Status:** **Completed & Accepted (63 personalization tests passed, 218 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway + 27 Fulfillment & Tracking + 63 Personalization & Proofs, Next.js production build passed 36/36 dynamic and static routes).**

### Batch 8 — GST Invoicing, Packing Slips & Transactional Emails *(Completed & Verified)*
- **Objective:** Consecutive GST-compliant tax invoice generation within Indian Financial Year (Asia/Kolkata timezone, Rule 46(b) 16-character limit, e.g. `SG/26-27/0001`). Server-side binary PDF tax invoice and fulfillment packing slip generation with zero price/tax leakage. Secure private document storage (`storage/private/invoices/`, `storage/private/packing-slips/`) with authorized customer/guest token and staff RBAC download endpoints. Asynchronous transactional email architecture with persistent database outbox (`EmailOutbox`), worker batch processing, bounded retries with backoff, concurrency locking, and non-fatal failure isolation.
- **Dependencies:** Batch 4 (Pricing snapshots), Batch 6 (Order lifecycle & dispatch event).
- **Deliverables:** PDF engine (`src/lib/pdf/pdf-writer.ts`), Tax Invoice generator (`src/lib/pdf/invoice-pdf.ts`), Packing Slip generator (`src/lib/pdf/packing-slip-pdf.ts`), Invoicing service (`src/lib/invoices/invoice.service.ts`), Sequence number generator (`src/lib/invoices/invoice-number.service.ts`), Seller config service (`src/lib/invoices/seller-config.service.ts`), Email templates (`src/lib/email/email-templates.ts`), Email outbox service (`src/lib/email/email-outbox.service.ts`), API endpoints (`GET /api/orders/[orderNumber]/invoice`, `GET /api/admin/orders/[id]/packing-slip`, `GET/POST /api/admin/invoices`, `GET/PATCH /api/admin/seller-config`, `GET /api/admin/email/outbox`, `POST /api/admin/email/process`, `POST /api/admin/email/retry`), Admin UI tabs for Seller Config & Outbox (`src/components/admin/AdminDashboard.tsx`), Prisma schema update and migration (`prisma/migrations/20261030_batch8_gst_invoices_packing_slips_emails/migration.sql`), automated test suite (`src/test/invoicing.test.ts`).
- **Status:** **Completed & Verified (19 invoicing/email tests passed, 237 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway + 27 Fulfillment & Tracking + 63 Personalization & Proofs + 19 GST Invoices & Emails, Next.js production build passed 41/41 routes).**

### Batch 9A — Corporate B2B Portal & Multi-Address CSV Dispatch *(Completed & Verified)*
- **Objective:** Build enterprise corporate onboarding, role-based corporate memberships (`OWNER`, `REQUESTER`, `APPROVER`, `FINANCE`), Request for Quotation (RFQ) lifecycle, authoritative corporate and negotiated pricing tiers, multi-revision quote approval workflow, multi-destination delivery allocations with grouped child orders, and CSV-based bulk recipient upload with injection sanitization and row-level error reporting.
- **Dependencies:** Batch 4 (Pricing engine & Integer Paise calculation), Batch 6 (Order lifecycle, shipment tracking), Batch 8 (GST invoice and sequence linkage).
- **Deliverables:**
  - Prisma Models & Migration: `CorporateMembership`, `CorporateAddress`, `CorporateRFQ`, `CorporateRFQItem`, `CorporateQuote`, `CorporateQuoteItem`, `CorporatePriceAgreement`, `CorporatePriceTier`, `CorporateOrderGroup`, `CorporateDeliveryAllocation` (`prisma/migrations/20261030_batch9a_corporate_portal_rfq_pricing_multi_address/migration.sql`).
  - Domain Services: Comprehensive corporate service (`src/lib/corporate/corporate.service.ts`) enforcing pricing priority hierarchy, immutable quote snapshots, multi-revision quote invalidation, delivery allocation reconciliation, CSV parsing with formula injection defense (`=`, `+`, `-`, `@`, `\t`, `\r` stripped), atomic/idempotent approval and order placement, and development fallback stores.
  - Customer API Routes:
    - Onboarding & Profile: `POST /api/corporate/register`, `GET /api/corporate/profile`
    - Team & Locations: `GET, POST /api/corporate/members`, `PATCH, DELETE /api/corporate/members/[id]`, `GET, POST /api/corporate/addresses`
    - RFQ Lifecycle: `GET, POST /api/corporate/rfq`, `GET /api/corporate/rfq/[id]`
    - Quotations & Approval: `GET /api/corporate/quotes`, `GET /api/corporate/quotes/[id]`, `POST /api/corporate/quotes/[id]/respond`
    - Bulk Upload & Checkout: `POST /api/corporate/csv/validate`, `GET /api/corporate/orders`, `POST /api/corporate/orders/checkout`, `GET /api/corporate/orders/[id]`
  - Admin API Routes:
    - Account Management: `GET /api/admin/corporate/accounts`, `GET, PATCH /api/admin/corporate/accounts/[id]`
    - RFQs & Quotations: `GET /api/admin/corporate/rfqs`, `GET, PATCH /api/admin/corporate/rfqs/[id]`, `GET, POST /api/admin/corporate/quotes`, `POST /api/admin/corporate/quotes/[id]/revise`
    - Pricing & Orders: `GET, POST /api/admin/corporate/pricing`, `GET /api/admin/corporate/orders`
  - Frontend UIs:
    - Corporate Portal (`src/components/b2b/CorporatePortal.tsx`): 7 interactive tabs (Dashboard, Registration/Onboarding, Profile & Team, RFQs & Drafts, Quotes & Approvals, CSV Bulk Dispatcher, Group Orders & Tracking) fully connected to live APIs.
    - Admin Corporate Administration Desk (`src/components/admin/AdminDashboard.tsx`): Subtabs for Account Approval/Suspension, RFQ Management, Quote Preparation & Revisions, Multi-Address Group Order Oversight, and Agreed Corporate Pricing Contracts.
  - Automated Verification: Dedicated test suite (`src/test/corporate.test.ts`) integrated into master runner (`src/test/run-all.ts`).
- **Status:** **Completed & Verified (28 corporate tests passed, 284 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway + 27 Fulfillment & Tracking + 63 Personalization & Proofs + 38 GST Invoices & Emails + 28 Corporate B2B & RFQ, Next.js production build passed).**

### Batch 9B — Dealer Portal & MRP Pricing *(Scope Pending Written Approval)*
- **Objective:** Dealer self-service portal with dual pricing display (Retail MRP vs Dealer Wholesale Price), minimum dealer pack sizes, and daily dealer flash deals.
- **Dependencies:** Batch 9A, Formal Change Request Approval.
- **Deliverables:** Dealer role, wholesale catalog, dealer checkout.

### Batch 10 — Administrative Control, Self-Service & Reporting
- **Objective:** Storewide operational settings (contact details, GST rates, shipping charges, free shipping threshold), customer CRM, audit trail log viewer, sales analytics and CSV export.
- **Dependencies:** Batches 1–9.
- **Deliverables:**
  - Database Schema & Migrations: `StoreConfig` model, `AuditLog` indexing on `createdAt`, and PostgreSQL migration `20261030_batch10_admin_settings_audit_reports`.
  - Backend Admin Service (`src/lib/admin/admin.service.ts`):
    - Operational overview metrics distinguishing CAPTURED revenue (integer paise) from pending/authorized checkouts.
    - User CRM with pagination, search, role modification, self-demotion/deactivation safeguards, and automatic session revocation via `invalidateAllUserSessions`.
    - Centralized business settings (`getStoreConfig`, `updateStoreConfig`) with input validation and audit logging.
    - Financial & Operational Reports: Sales report with product/category aggregations, state-wise orders breakdown, inventory retail valuation, and tax invoice summaries.
    - OWASP formula injection protection (`sanitizeCsvCell`) prefixing spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes (`''`).
    - Audit logging service (`logAdminActivity`, `queryAuditLogs`) with automated credential/secret redaction.
    - Read-only system health and adapter diagnostics (`getSystemHealthOverview`).
  - Secure REST API Endpoints:
    - `/api/admin/overview`, `/api/admin/settings`, `/api/admin/users`, `/api/admin/users/[id]`
    - `/api/admin/reports/sales`, `/api/admin/reports/orders`, `/api/admin/reports/inventory`, `/api/admin/reports/taxes`
    - `/api/admin/audit-logs`, `/api/admin/system/health`
  - Frontend Unified Administration Desk (`src/components/admin/AdminDashboard.tsx`): 12 functional panels including Overview, Users CRM, Business Reports, Store Settings, Audit Log Inspector, System Health Diagnostics, and Support Tickets.
  - Comprehensive Operational Documentation: `docs/ADMIN_OPERATIONAL_MANUAL.md` covering all 14 SOPs and administrative runbooks.
  - Automated Verification: Dedicated test suite (`src/test/admin.test.ts`) with 24 tests integrated into master test runner (`src/test/run-all.ts`).
- **Status:** **Completed & Verified (24 Batch 10 tests passed, 308 master verification tests passed: 22 Auth & RBAC + 30 Catalog & Inventory + 27 Storefront & SEO + 20 Checkout & Pricing + 29 Payment & Gateway + 27 Fulfillment & Tracking + 63 Personalization & Proofs + 38 GST Invoices & Emails + 28 Corporate B2B & RFQ + 24 Admin & Business Ops, TypeScript compilation passed with zero errors, Next.js production build passed with all 64 routes).**

### Batch 11 — Hardening, Security, Performance & QA Verification
- **Objective:** Full security audit, vulnerability remediation, provider-independent distributed rate limiting, OWASP hardening, WCAG 2.2 AA accessibility, performance benchmarks, and automated E2E journey verification across Batches 0–10.
- **Dependencies:** Batches 0–10.
- **Deliverables:**
  - Security Vulnerability Remediation: Deactivated account OTP lockout (`/api/auth/otp/verify`), explicit cookie path scopes (`/api/auth/logout`), `DEV_SESSIONS_STORE` purge on invalidation, tenant isolation verification on corporate endpoints (`getCorporateRFQ`, `getCorporateQuote`, `getCorporateOrderGroup`), constant-time SHA-256 guest token digest comparison (`crypto.timingSafeEqual`), and corporate CSV upload size gating (2 MB limit) with formula injection neutralization (`sanitizeCsvCell`).
  - Provider-Independent Distributed Rate Limiting (`src/lib/security/rate-limit.ts`): Upstash Redis REST pipeline adapter, in-memory development adapter (`DEV_RATE_LIMITER_STORE`), fail-closed production safety guard, and route enforcement across `/api/auth/login`, `/api/auth/register`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/payments/create-order`, and guest lookup.
  - Production Security Headers (`next.config.mjs`): HSTS (`max-age=63072000`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and strict CSP whitelisting Razorpay and Unsplash.
  - Deployment Safeguards: `.vercelignore` created to exclude test suites, docs, scripts, and local stores.
  - WCAG 2.2 AA Accessibility: Modal dialog landmarks (`role="dialog"`, `aria-modal="true"`), close button labels, and alert announcement roles in `AuthModal.tsx`, `CheckoutModal.tsx`, `OrderTrackingModal.tsx`, `Header.tsx`, and `Footer.tsx`.
  - Automated Test Suites & E2E Journeys: Dedicated Batch 11 security suite (`src/test/security.test.ts`), Playwright E2E configuration (`playwright.config.ts`, `e2e/user-journeys.spec.ts`), and master test suite runner (`src/test/run-all.ts`).
  - Comprehensive Operational Documentation: `docs/SECURITY_AUDIT_REPORT.md`, `docs/QA_TEST_STRATEGY.md`, `docs/BACKUP_RECOVERY_RUNBOOK.md`, `docs/RELEASE_READINESS_REPORT.md`.
- **Status:** **Completed & Verified (29 Batch 11 security tests passed, 3 E2E user journeys passed, 340 master verification tests passed with 0 failures across 12 suites, TypeScript compilation passed with zero errors, Next.js production build passed with all 64 routes).**

### Batch 12 — Deployment Runbook, Production Cutover & Handover
- **Objective:** Production environment configuration on managed cloud (Vercel/Render/Railway + Neon/Supabase PostgreSQL + S3 + Razorpay Live credentials), DNS cutover, SSL verification, production smoke testing, and admin operational handover.
- **Dependencies:** Batch 11.
- **Deliverables:** Tested deployment runbook, verified live checkout, admin training guide.

---

## 4. Scope Governance & Exclusions

To prevent scope creep and protect token budgets, the following rules are strictly enforced:

| Feature / Request | Scope Status | Policy |
| :--- | :--- | :--- |
| **Brand Name** | Mandatory | Brand name is **Snappy Gifts**, configured via centralized settings. Remove old Ajmer Gift Charm branding in phased fashion. |
| **Coupons & Promo Codes** | Deferred | Excluded from initial build; keep database schema compatible for future activation. |
| **Dealer Portal & MRP** | Unapproved Scope | Requires explicit written client change control approval before implementation. |
| **WhatsApp / SMS Integration** | Excluded | Excluded from current SOW. WhatsApp floating button will be removed or replaced by standard email/contact form. |
| **Wishlist & Product Reviews** | Excluded | Excluded from current SOW. Mock reviews in baseline will be replaced by verified client testimonials. |
| **Refunds / Returns Workflow** | Excluded | Excluded from current SOW. Managed via offline customer care. |
| **ERP / Inventory Sync** | Excluded | Platform maintains its own internal inventory database; no external ERP connectors. |
| **GSTIN & Tax Assumptions** | Guarded | Do not invent real GSTINs or legal entities. Test placeholders must be clearly marked and must block live invoicing until real business credentials are supplied. |
