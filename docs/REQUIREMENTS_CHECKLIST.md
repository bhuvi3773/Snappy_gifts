# Snappy Gifts — Requirements Traceability Checklist

**Document Version:** 1.0 (Baseline Batch 0)  
**Status Legend:**
- `Not Started`: Feature defined in SOW / Master Build Plan, awaiting its scheduled batch.
- `In Progress`: Active work underway in current batch.
- `Implemented`: Code written and committed, awaiting verification.
- `Tested`: Validated with automated unit/integration or browser tests.
- `Blocked`: Implementation halted pending prerequisite, external dependency, or client approval.
- `Accepted`: Verified and signed off by client.

---

## 1. Batch 0 — Repository Audit & Foundation

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B0-01** | Inspect repository tree, package manifests, and git history | Foundation | **Tested** | Git status clean; branch `snappy-gifts/batch-0-audit-foundation-20261029`. |
| **B0-02** | Identify framework, runtime, package manager, and entrypoints | Audit | **Tested** | Node `v24.13.0`, npm `11.6.2`, React 19 + Vite 8. |
| **B0-03** | Inventory all pages, modals, components, and hardcoded mock data | Audit | **Tested** | Documented in `docs/REPOSITORY_AUDIT.md`. |
| **B0-04** | Document licensing, asset reuse, and brand replacement status | Legal / Brand | **Implemented** | License absence flagged in `docs/DECISIONS.md`. Snappy Gifts brand configured. |
| **B0-05** | Establish documentation suite (`AUDIT`, `PLAN`, `CHECKLIST`, `MODEL`, `DECISIONS`, `RUNBOOK`) | Docs | **Implemented** | All 6 core documents created in `docs/`. |
| **B0-06** | Create local development container config for PostgreSQL and Mailpit | Infra | **Implemented** | `docker-compose.yml` prepared with PostgreSQL 16 & Mailpit. |
| **B0-07** | Draft relational Prisma schema in integer paise | Data Model | **Implemented** | `prisma/schema.prisma` created with complete entities. |
| **B0-08** | Setup environment variable validation and safe `.env.example` | Security | **Tested** | `src/config/env.ts` and updated `.env.example` created. |
| **B0-09** | Configure standard scripts for lint, typecheck, test, and build | Tooling | **Tested** | `npm run lint` and `npm run build` executed and passed. |
| **B0-10** | Verify git diff and ensure zero secrets leaked | Security | **Tested** | All `.env*` files protected in `.gitignore`. |

---

## 2. Batch 1 — Next.js Migration, Authentication & RBAC

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B1-MIG** | Migrate framework from client-only Vite SPA to Next.js App Router | Architecture | **Tested** | App Router (`src/app/layout.tsx`, `page.tsx`, `globals.css`, `not-found.tsx`, `error.tsx`) compiled via `next build` (11/11 routes). |
| **B1-01** | Server-side user authentication (Email + Password with secure bcrypt hashing) | Auth | **Tested** | `/api/auth/register`, `/api/auth/login`, `src/lib/auth/password.ts`. 19 automated tests passed. |
| **B1-02** | Passwordless Email OTP login/verification flow (single use, expiry, attempt limit) | Auth | **Tested** | `/api/auth/otp/send`, `/api/auth/otp/verify`, `src/lib/auth/otp.ts`. Brute-force lockout and timing-safe checks tested. |
| **B1-03** | Centralized Role-Based Access Control (RBAC) helper (`requireRole`, `requireAuth`) | Security | **Tested** | `src/lib/auth/rbac.ts`. Enforces `CUSTOMER`, `B2B_CLIENT`, `STAFF`, `ADMIN`. |
| **B1-04** | Server-side protection for admin and corporate operations | Security | **Tested** | `/api/admin/catalog` and `/api/b2b/rfq` protected with 401/403 responses. `AuthModal` wired in `Header.tsx`. |
| **B1-05** | Secure first-admin bootstrap procedure | Admin | **Tested** | `scripts/bootstrap-admin.ts` provides zero-hardcoded credential CLI initialization. |
| **B1-06** | Session persistence and secure HTTP-only cookies | Session | **Tested** | `src/lib/auth/session.ts` with 30-day database session lifecycle and `SameSite: lax`. |

---

## 3. Batch 2 — Catalog & Admin Inventory

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B2-01** | Relational Categories & Occasions management | Catalog | **Tested** | Normalized `Category` & `Occasion` models with `/api/admin/catalog/categories` and `/api/admin/catalog/occasions` CRUD, slug uniqueness, and safe deactivation when products are linked. |
| **B2-02** | Product variants schema (Color, Size, SKU, attributes) | Catalog | **Tested** | `ProductVariant` model with unique SKU index, attributes JSON, paise prices, `isActive`/`isArchived` soft-delete fields, and `deleteVariantSafely` archiving guard. |
| **B2-03** | Admin catalog CRUD with image gallery management | Admin | **Tested** | Full gallery workflow: `/api/admin/catalog/products/[id]/images`, reordering, primary flag toggling, binary magic bytes validation, and path traversal defense. |
| **B2-04** | Stock tracking per variant with low-inventory warnings | Inventory | **Tested** | `/api/admin/catalog/inventory/adjust`, `executeStockAdjustment`, non-negative inventory invariant, and concurrent transaction serialization. |
| **B2-05** | Audit log for catalog price and inventory updates | Audit | **Tested** | Immutable `InventoryAdjustment` ledger with `onDelete: Restrict` and permanent SKU/product snapshots, preventing historical audit destruction. |

---

## 4. Batch 3 — Storefront, Search, Filter & SEO

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B3-01** | Homepage curated hero banner & category spotlights | Storefront | **Tested** | Hero banner and Rajasthan artisan spotlights preserved and integrated with dynamic categories and load-more pagination in `src/App.tsx`. |
| **B3-02** | Real-time category and occasion filter system | Storefront | **Tested** | Category pills and occasion strip with multi-filter combinations and price/newest sorting verified via automated tests (`src/test/storefront.test.ts`). |
| **B3-03** | Server/client search with query sanitization & bounds | Search | **Tested** | Dedicated `/api/catalog/products` public API with bounded pagination, string length limits (100 chars), and integer paise pricing invariants. |
| **B3-04** | Dynamic product details page with specs & fallback | Product | **Tested** | Server-rendered SSR product detail page at `/products/[slug]` with JSON-LD Schema.org product data, gallery display, and 404 `notFound()` handling. |
| **B3-05** | Server-rendered dynamic metadata, OpenGraph, robots & sitemap | SEO | **Tested** | `generateMetadata` generating canonical URLs, OpenGraph, Twitter card, `robots.ts` disallowing admin/private APIs, and dynamic `sitemap.ts`. |

---

## 5. Batch 4 — Pricing, Cart & Checkout Engine

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B4-01** | Centralized server-side pricing engine in integer paise | Pricing | **Tested** | Implemented `calculateCartPricing` in `src/lib/pricing/pricing.service.ts` rejecting client prices, validating quantities (1–500), rounding using integer arithmetic, and verifying inactive/archived rejections (20 tests in `src/test/checkout.test.ts`). |
| **B4-02** | Tiered bulk volume discounts engine | Pricing | **Tested** | Built into server pricing engine calculating tiered discounts while preserving integer paise invariants. |
| **B4-03** | Indian GST calculation engine (CGST/SGST vs IGST by state code) | Tax | **Tested** | Place of supply Ajmer, Rajasthan ("08"). Deliveries to state "08" split GST into 50% CGST + 50% SGST (rounding safe); interstate deliveries levy 100% IGST. Supported via `resolveStateCode` and verified in test suite. |
| **B4-04** | Indian PIN code serviceability and delivery estimates | Checkout | **Tested** | Implemented `src/lib/shipping/pincode.service.ts` with 6-digit regex validation, 2-digit GST state resolution, and serviceability checks; exposed via `GET /api/shipping/pincode`. |
| **B4-05** | Transactional order creation with 15-minute stock hold | Checkout | **Tested** | Implemented `createOrder` in `src/lib/orders/order.service.ts` with atomic `prisma.$transaction`, deduplication idempotency keys, separate `PENDING` order/payment statuses, 15-minute hold timestamps (`reservationExpiresAt`), and `releaseExpiredReservations` audit-ledger restoration. |
| **B4-06** | Coupon & promo code engine | Promo | `Blocked (Deferred)` | Deferred outside agreed Batch 4 scope; coupons disabled during server checkout recalculation. |

---

## 6. Batch 5 — Payments Engine & Webhooks

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B5-01** | Payment Provider Adapter interface | Payment | **Tested** | Defined in `src/services/adapters/payment.adapter.ts`. Supports `createOrder`, `verifyPaymentSignature`, and `verifyWebhookSignature` with exact integer paise amounts, INR currency, and structured error types. |
| **B5-02** | Local Mock Payment Adapter for automated tests | Payment | **Tested** | Implemented in `src/lib/payments/mock.adapter.ts` with cryptographic HMAC-SHA256 mock signing and timing-safe verification. Factory in `payment-factory.ts` strictly forbids mock driver in production. |
| **B5-03** | Razorpay Order creation API (`razorpay.orders.create`) | Payment | **Tested** | Implemented `RazorpayPaymentAdapter` calling `https://api.razorpay.com/v1/orders`. Server endpoint `POST /api/payments/create-order` derives authoritative amount from DB in integer paise, enforces order ownership/guest authorization, and prevents duplicate gateway orders on retry. |
| **B5-04** | Raw-body webhook signature verification | Payment | **Tested** | Implemented in `POST /api/webhooks/razorpay` and `razorpay.adapter.ts` using `crypto.timingSafeEqual` over HMAC-SHA256 of the exact unparsed request body string with `RAZORPAY_WEBHOOK_SECRET`. |
| **B5-05** | Idempotent payment webhook handler with gateway total match | Payment | **Tested** | Processed in `src/lib/payments/payment.service.ts`. Deduplicates deliveries via `WebhookEvent.eventId`. Transactionally captures payments and confirms orders. Reconciles amount mismatches, unauthorized currencies, and late payments after 15-minute stock hold expiry into `PaymentReconciliation`. |

---

## 7. Batch 6 — Order Lifecycle & Fulfillment

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B6-01** | Formal Order State Machine with transition constraints | Fulfillment | **Tested** | Implemented `ORDER_TRANSITION_MATRIX` in `src/lib/orders/order-lifecycle.service.ts`. Enforces `PENDING` → `CONFIRMED` → `IN_CUSTOMIZATION` → `QUALITY_CHECK` → `DISPATCHED` → `DELIVERED` with QC rework loops. Forbids skipping states, blocks confirming unpaid orders, treats `DELIVERED` and `CANCELLED` as terminal states. Transactional DB update logs to `OrderStatusHistory`. Verified in `fulfillment.test.ts`. |
| **B6-02** | Admin order management and dispatch assignment | Admin | **Tested & UI Integrated** | Implemented protected endpoints `GET /api/admin/orders` (pagination, search, status/date filters), `GET /api/admin/orders/[id]` (item snapshots, addresses, paise financial totals, payments, shipments, audit trail), `PATCH /api/admin/orders/[id]/status`, `POST /api/admin/orders/[id]/dispatch`, `POST /api/admin/orders/[id]/deliver`. Enforces `requireRole([ADMIN, STAFF])` and rejects client attempts to modify payment state via fulfillment routes. Integrated directly into `AdminDashboard.tsx` with server fetcher, pagination controls, search/status filters, permitted transitions selector (`ORDER_TRANSITION_MATRIX`), full audit inspection modal, and courier dispatch modal. |
| **B6-03** | Manual courier AWB and partner assignment (Delhivery/BlueDart) | Logistics | **Tested & UI Integrated** | Implemented baseline manual courier dispatch recording in `POST /api/admin/orders/[id]/dispatch`. Validates carrier name, AWB tracking number, and validates tracking URLs strictly against HTTP/HTTPS schemes (rejecting javascript/data/file/malformed links). Stored in `Shipment` model with `trackingUrl` column (`migration.sql`). Delivery confirmation in `POST /api/admin/orders/[id]/deliver`. Dispatch modal in `AdminDashboard.tsx` provides carrier picker, AWB input, and tracking URL validation. |
| **B6-04** | Privacy-safe customer tracking (Order ID + matching phone/email) | Tracking | **Tested & UI Integrated** | Updated `src/lib/orders/order-lookup.service.ts` and `GET /api/orders/[orderNumber]`, `POST /api/orders/lookup`. Authenticated lookups verify session ownership; guest lookups require Order Number + matching email or 10-digit phone. Enforces rate-limiting (10/min) and never leaks internal staff notes or unneeded admin metadata in public responses. Integrated tracking portal URL in `OrderTrackingModal.tsx`. |
| **B6-05** | Customer authenticated order history view | Account | **Tested & UI Integrated** | Implemented `GET /api/orders` protected by `requireAuth`. Derives `userId` strictly from validated server session token. Queries customer's orders with item snapshots, paise totals, payment status, and shipment tracking without exposing internal staff notes. Wired to `OrderTrackingModal.tsx` order selector. |

---

## 8. Batch 7 — Personalization Studio & Proofs

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B7-01** | Interactive client-side canvas preview (text, font, foil, artwork, crop/placement) | Personalization | **Accepted** | Enhanced `PersonalizationStudio.tsx` with 4-tab workflow (`1. Inscription`, `2. Artwork / Logo`, `3. Gift Card`, `4. Box & Presentation`), real-time live mockup rendering, scale slider (0.5x to 2.0x), horizontal/vertical offset sliders, alignment preset buttons (`Center`, `Lid`, `Plaque`), artisan disclaimer banner, and customer proof approval checkbox. Verified across responsive viewports. |
| **B7-02** | Server-side secure file upload with MIME, magic bytes, size & path traversal validation | Security | **Accepted** | Implemented `privateStorageService` (`src/services/storage/private-storage.service.ts`) storing customer uploads privately under `storage/private/` (never exposed via `public/uploads/` or unauthenticated static routes). Enforces authentic magic bytes (JPEG/PNG/WebP), <=5MB size threshold, SHA-256 binary hash, cryptographic storage keys, and path traversal guards. Authorized binary stream endpoint `GET /api/personalization/uploads/[id]/file` verifies session ownership or Admin/Staff role. 7-day retention for unattached artwork in `ArtworkUpload`. Tested in `src/test/personalization.test.ts`. |
| **B7-03** | Server-computed personalization fee surcharge & client tampering prevention | Pricing | **Accepted** | Implemented in `src/lib/pricing/pricing.service.ts`, `src/lib/orders/order.service.ts`, and `src/components/PersonalizationStudio.tsx`. Verifies product `isCustomizable` eligibility, enforces 32-character inscription and 200-character gift note length limits. Authoritatively computes base customization fee + packaging surcharges. Crate surcharge is explicitly configurable via `WOODEN_CRATE_SURCHARGE_PAISE` (15,000 paise = ₹150) and `WOODEN_CRATE_SURCHARGE_APPROVED`. When unapproved (`WOODEN_CRATE_SURCHARGE_APPROVED=false`), fails safely by disabling option in UI, rejecting unauthorized quote calculations (`PricingValidationError`), and rejecting crafted checkout requests (`OrderValidationError`). Overrides client-submitted prices or totals. Tested against price injection attacks. |
| **B7-04** | Persisted distinct customer preview proof asset & separated approval semantics | Fulfillment | **Accepted** | Implemented `generateCustomerProofPngBuffer` and `OrderPersonalization` relation in Prisma (`prisma/migrations/20261029_batch7_personalization_artwork_proofs`). Persists genuine rendered PNG preview proofs under `storage/private/proofs/` distinct from raw customer artwork uploads. Server proof engine rasterizes customer inscription, typography, uploaded artwork bytes, placement offsets/scale, variant, and packaging into a distinct 500x380 RGBA PNG asset watermarked as visual approval representation. Dual-engine visual fidelity: client preview canvas snapshot (`clientProofDataUrl`) captures exact loaded fonts and decoded images as reviewed by the customer, while server engine performs typeface-aware rasterization (serif foot/head caps, script italic shear, sans kerning) and artwork format detection. Explicitly separates customer consent (`customerApprovalStatus`, `customerApprovedAt`, `customerApprovedBy`) from staff review (`staffReviewStatus`, `staffReviewedAt`, `staffReviewedBy`). Proof revisions increment `proofVersion` and invalidate prior customer approvals. |
| **B7-05** | Artisan proof inspection, staff review & upload retention cleanup | Admin | **Accepted** | Implemented `PATCH /api/admin/personalization/proofs/[orderItemId]/review`, `GET /api/personalization/config`, and `POST /api/admin/personalization/uploads/cleanup` requiring Admin or Staff role. Staff verification cannot overwrite customer consent. Upload cleanup deletes expired unattached uploads while strictly preserving `ATTACHED` artwork and `proofs/`. Integrated into `AdminDashboard.tsx` with bespoke personalization card and one-click artisan verification/rework actions. Verified across 33 automated tests (188 master tests passed). |
| **B7-06** | Customer Proof Re-Approval Workflow & Lifecycle Gate Enforcement | Personalization | **Accepted** | Implemented `POST /api/orders/[orderNumber]/proofs/[orderItemId]/approve` for authenticated session or guest (`x-guest-token` header). Validates explicit consent (`consent === true`), ownership, item linkage, and exact proof version match. Uses atomic database updates (`updateMany` with version condition) to prevent race conditions with concurrent revisions. Idempotently returns 200 OK for already-approved proofs. Never allows customers to modify staff review status, staff notes, pricing, or order status. Connects approval flow to `OrderTrackingModal.tsx` with authorized proof preview, version badge, invalidation notices for revised proofs, and explicit consent approval action without exposing internal staff notes or storage keys. Production gate strictly blocks orders with pending customer approval or staff rework rejection from entering `IN_CUSTOMIZATION`. Verified across 58 automated tests (213 master tests passed). |
| **B7-07** | Guest Proof Preview Token Hardening & Browser Object URL Lifecycle | Security | **Accepted** | Hardened `GET /api/personalization/uploads/[id]/file` to accept guest authorization tokens solely via `x-guest-token` header, timing-safely compared (`crypto.timingSafeEqual`), and strictly rejecting `?token=` query-string authorization with 403 Forbidden to eliminate token exposure in browser URLs, history, server logs, and referrer headers. Updated `OrderTrackingModal.tsx` to retrieve proof images via same-origin `fetch()` passing `x-guest-token` for guests (or authenticated session for registered customers), convert responses to browser object URLs (`URL.createObjectURL(blob)`), and revoke all object URLs on image replacement, order switch, and component unmount (`URL.revokeObjectURL()`). Added automated tests (Tests 60–64) verifying header streaming, invalid token rejection, query-string rejection, cross-customer protection, and object URL lifecycle cleanup. Total 218 master tests passed. |

---

## 9. Batch 8 — GST Invoicing & Transactional Emails

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B8-01** | Sequential GST tax invoice number generation | Invoicing | **Tested & Accepted** | Implemented `getNextInvoiceSequence` and `formatGstInvoiceNumber` in `src/lib/invoices/invoice-number.service.ts`. Generates consecutive unique numbers partitioned by financial year (e.g. `2026-27`) and admin prefix (e.g. `SG`) strictly adhering to Indian Financial Year (Asia/Kolkata timezone with April 1 rollover boundary) and CGST Rule 46(b) 16-character limit (e.g. `SG/26-27/0001`). Concurrency-safe sequence table with unique database constraint. Re-running invoice generation reuses original sequence and invoice record without gaps or duplicates. |
| **B8-02** | Server-side PDF invoice & warehouse packing slip generation | Invoicing | **Tested & Accepted** | Pure TypeScript PDF-1.4 writer (`src/lib/pdf/pdf-writer.ts`) generating valid binary PDFs. Tax invoices (`src/lib/pdf/invoice-pdf.ts`) include all Rule 46 particulars (seller GSTIN, customer details, HSN, rate, CGST/SGST/IGST breakdown, reverse charge, place of supply, INR currency formatting, and SAMPLE watermark for unverified seller data). **Compliance Corrections & Signature Safeguards:** (1) Removed unverified claims of e-invoicing exemption; defaults to `PENDING_ACCOUNTANT_CONFIRMATION` which blocks production issuance until audited against PAN-level aggregate turnover across all GSTINs from FY 2017–18 onwards (CGST Section 2(6) & Rule 48(4)); (2) E-invoicing applicability restricted under Notification 13/2020-CT to B2B supplies (registered persons), exports, and SEZ units; retail B2C consumer orders are excluded from IRP IRN generation and issued under Rule 46; (3) Implemented mandatory statutory declaration under CGST Rule 46(s) when PAN aggregate turnover exceeds ₹5 Crores but taxpayer qualifies under a notified exemption; (4) Hardened signature compliance under CGST Rule 46(q), separating supplier signature requirements (Rule 46(q)) from IRN QR codes (Rule 46(r)); for `PHYSICAL_SIGNATURE_ON_PRINT`, the physical signature box is retained and server-side dispatch strictly enforces explicit staff confirmation that the invoice was physically printed and signed prior to courier handover (recording staff user and timestamp); for digital signatures, valid DSC is required; for electronic invoice exemptions under Rule 46 second proviso, explicit accountant confirmation is required. Fulfillment packing slips (`src/lib/pdf/packing-slip-pdf.ts`) include order number, recipient, delivery address, SKUs, quantities, and personalization instructions while strictly excluding all prices, grand totals, GST amounts, and staff notes. Stored privately via `privateStorageService` under `storage/private/invoices/` and `storage/private/packing-slips/`. Authorized download endpoints: customer/guest `GET /api/orders/[orderNumber]/invoice` (`x-guest-token` header, no query params) and staff RBAC `GET /api/admin/orders/[id]/packing-slip`. |
| **B8-03** | Email Provider Adapter interface | Email | **Tested & Accepted** | Core `EmailAdapter` interface in `src/services/adapters/email.adapter.ts`. Implemented production fail-closed behavior, development simulation logging, and Mailpit SMTP support via environment configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). Never assumes delivery without real credentials. |
| **B8-04** | Local Mailpit integration for development testing | Email | **Tested & Accepted** | Configured in `docker-compose.yml` (ports 1025 SMTP, 8025 UI). Adapter gracefully logs simulated local delivery when offline and delivers via SMTP when container is running. |
| **B8-05** | Transactional email jobs with retry & deduplication | Email | **Tested & Accepted** | Implemented persistent database outbox `EmailOutbox` in `src/lib/email/email-outbox.service.ts`. Features unique `idempotencyKey` preventing duplicate sends, worker locking (`status = PROCESSING`, `lockedAt`), bounded exponential backoff retries (`MAX_RETRY_ATTEMPTS = 5`), and stuck message recovery. Handled events: `ORDER_CONFIRMATION`, `INVOICE_AVAILABLE`, and `SHIPMENT_DISPATCHED`. Responsive HTML and plain-text templates in `src/lib/email/email-templates.ts` with XSS input escaping. Non-fatal: email failure never reverses payment or order status. Protected admin processing endpoints `GET /api/admin/email/outbox`, `POST /api/admin/email/process`, `POST /api/admin/email/retry`. Integrated into `AdminDashboard.tsx`. |

---

## 10. Batch 9A — Corporate B2B Portal & Bulk CSV Dispatch

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B9A-01** | Corporate client profile & GSTIN validation | B2B | **Tested & Accepted** | Implemented corporate onboarding workflow in `src/lib/corporate/corporate.service.ts` and `POST /api/corporate/register`. Enforces status lifecycle (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`). Validates GSTIN format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) where provided. Only ADMIN/STAFF can review and approve applications (`PATCH /api/admin/corporate/accounts/[id]`). Customers cannot elevate themselves. Role-based corporate memberships (`OWNER`, `REQUESTER`, `APPROVER`, `FINANCE`) with tenant isolation preventing cross-company access. |
| **B9A-02** | Custom RFQ (Request for Quotation) generator and status flow | B2B | **Tested & Accepted** | Full RFQ lifecycle implemented (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `QUOTED` → `ACCEPTED` / `REJECTED` / `CANCELLED` / `EXPIRED`). Validates product IDs and variants against catalogue. Stores quantities, branding/personalization requirements, packaging, delivery dates, and budget. Does not reserve inventory or create orders at RFQ stage. Admin preparation of official quotations (`CorporateQuote`) with line items, canonical tax calculation, discounts, validity dates, revision history (`revisionNumber`), and supersession invalidation. Approvals restricted to `APPROVER` and `OWNER` roles. |
| **B9A-03** | Recipient CSV upload validation with row-level error reporting | B2B | **Tested & Accepted** | Server-side CSV parser (`validateAndParseCsv`) with strict security defenses: file size limit (5MB), row limit (5,000 rows), header validation (`recipientName`, `recipientPhone`, `productSku`, `quantity`, `addressLine1`, `city`, `state`, `pincode`), Indian PIN code regex validation (`^[1-9][0-9]{5}$`), and formula injection defense stripping leading `=, +, -, @, \t, \r` characters. Returns row-by-row errors with line numbers and field names. Zero silent row discard. |
| **B9A-04** | Master corporate order with multiple split child shipments | B2B | **Tested & Accepted** | Grouped order architecture (`CorporateOrderGroup` + child `Order` records). Reconciles delivery allocations with approved quote line item quantities and grand totals. Creates atomic child orders (`CORP-2026-XXXX-01`, etc.) each associated with a distinct destination address and recipient. Child orders preserve individual shipment tracking, fulfillment state machine, and sequential GST tax invoices under existing Batch 6 & 8 architecture. |
| **B9A-05** | Corporate payment approval (Prepaid online vs Net-30 credit) | B2B | **Tested & Accepted** | Corporate checkout (`POST /api/corporate/orders/checkout`) validates approved quote state, non-expired validity, and user role. Integrates into trusted payment gateway architecture (`MOCK` / `RAZORPAY`). Strict server-side validation blocks payment bypass; credit facilities require explicit approved credit agreements. All monetary amounts computed in integer paise. |

---

## 11. Batch 9B — Dealer Portal & MRP Pricing *(Scope Pending Approval)*

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B9B-01** | Dealer user role and authenticated wholesale portal | Dealer | `Blocked (Approval Required)` | Requires signed change request. |
| **B9B-02** | Dual pricing display: Retail MRP vs Dealer Wholesale Price | Pricing | `Blocked (Approval Required)` | Requires signed change request. |
| **B9B-03** | Dealer minimum order quantities (pack sizes) | Wholesale | `Blocked (Approval Required)` | Requires signed change request. |
| **B9B-04** | Dealer-only daily promotional flash offers | Promo | `Blocked (Approval Required)` | Requires signed change request. |

---

## 12. Batch 10 — Admin Completion, Settings & Reporting

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B10-01** | Storewide operational settings (branding, contact, GST rates, shipping fees) | Admin | `Tested & Accepted` | Implemented via `StoreConfig` model, `/api/admin/settings`, and `updateStoreConfig` with ADMIN RBAC enforcement and positive integer validation. Tested in `src/test/admin.test.ts`. |
| **B10-02** | Customer CRM & order history viewer | Admin | `Tested & Accepted` | Implemented via `listAdminUsers`, `getAdminUserDetails`, `updateAdminUserStatusOrRole`, `/api/admin/users`, and Admin Dashboard CRM view with pagination, search, role modification, self-demotion protection, and session revocation. Tested in `src/test/admin.test.ts`. |
| **B10-03** | Audit trail viewer for privileged actions | Security | `Tested & Accepted` | Implemented via `AuditLog` Prisma model with `createdAt` index, `logAdminActivity`, `queryAuditLogs`, `/api/admin/audit-logs`, and interactive payload modal in Admin Dashboard. Credentials and secrets auto-redacted. Tested in `src/test/admin.test.ts`. |
| **B10-04** | Sales and financial CSV export reports | Analytics | `Tested & Accepted` | Implemented via `generateSalesReport`, `generateOrdersReport`, `generateInventoryReport`, `generateTaxReport`, and `/api/admin/reports/*`. Strict integer paise tracking, captured revenue separation from pending checkouts, and OWASP formula injection protection (`sanitizeCsvCell`). Tested in `src/test/admin.test.ts`. |
| **B10-05** | Staff training materials and operational handbook | Admin | `Tested & Accepted` | Comprehensive operations manual created at `docs/ADMIN_OPERATIONAL_MANUAL.md` covering all 14 SOPs and administrative workflows. Verified against production standards. |

---

## 13. Batch 11 — Hardening, Security, Performance & QA

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B11-01** | Distributed rate limiting on auth, tracking, and checkout endpoints | Security | `Tested & Accepted` | Implemented in `src/lib/security/rate-limit.ts` supporting Upstash Redis REST pipeline with atomic windowing, fail-closed production safety, and route enforcement on `/api/auth/login`, `/api/auth/register`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/payments/create-order`, and guest lookup. Tested in `src/test/security.test.ts`. |
| **B11-02** | WCAG 2.2 AA accessibility compliance audit | A11y | `Tested & Accepted` | ARIA dialog landmarks (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), visible focus rings, alert status announcements (`role="alert"`), and descriptive button labels implemented in `AuthModal.tsx`, `CheckoutModal.tsx`, `OrderTrackingModal.tsx`, `Header.tsx`, and `Footer.tsx`. Documented in `docs/QA_TEST_STRATEGY.md`. |
| **B11-03** | Responsive cross-device testing across viewports | Mobile | `Tested & Accepted` | Mobile drawer, responsive flex grids, touch-friendly target sizes (min 44x44px), and viewport adaptation verified across Mobile (375px), Tablet (768px), and Desktop (1280px) viewports in Next.js build and component specs. |
| **B11-04** | Security audit & automated regression test coverage | QA | `Tested & Accepted` | Comprehensive application audit completed across Batches 0–10. All 10 in-scope findings rectified. Dedicated security suite (`src/test/security.test.ts`) passing 29/29 tests. Full master test suite passing 340/340 tests across 12 suites. Documented in `docs/SECURITY_AUDIT_REPORT.md`. |
| **B11-05** | End-to-end user journeys & Playwright E2E suite | QA | `Tested & Accepted` | End-to-end user journeys implemented and passing across Customer Gifting (18 steps), Admin Operations (16 steps), and Corporate B2B Procurement (10 steps). Playwright test suite configured in `playwright.config.ts` and `e2e/user-journeys.spec.ts`. Tested in `src/test/e2e-journeys.test.ts`. |

---

## 14. Batch 12 — Integrations, Staging & Go-Live Cutover

| Req ID | Requirement Description | Category | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **B12-01** | Cloud database provisioning (PostgreSQL) | Infra | `Not Started` | Scheduled Batch 12. |
| **B12-02** | Live Razorpay merchant credentials and webhook config | Payment | `Not Started` | Scheduled Batch 12. |
| **B12-03** | Production transactional email DNS (SPF, DKIM, DMARC) | Email | `Not Started` | Scheduled Batch 12. |
| **B12-04** | Production SSL & custom domain setup (`snappygifts.in` or similar) | Infra | `Not Started` | Scheduled Batch 12. |
| **B12-05** | Staging smoke testing & disaster recovery backup verification | QA | `Not Started` | Scheduled Batch 12. |

---

## 15. Out of Scope Exclusions

| Excluded Item | Justification / Policy |
| :--- | :--- |
| **Third-Party WhatsApp Concierge** | Excluded under current SOW. WhatsApp button in baseline will be replaced by standard contact form. |
| **SMS Gateway Integration** | Excluded under current SOW. Transactional notifications delivered via Email. |
| **Live Chat Widget** | Excluded under current SOW. Offline ticket/email support provided. |
| **Customer Product Reviews & Wishlist** | Excluded under current SOW. Simplifies initial MVP release. |
| **Automated Refunds & Self-Service Returns** | Excluded under current SOW. Handled manually via customer support. |
| **External ERP Integration** | Excluded under current SOW. Snappy Gifts maintains standalone database. |
