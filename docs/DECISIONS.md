# Snappy Gifts — Architecture Decisions & Governance Log

**Document Version:** 1.0 (Baseline Batch 0)  
**Status:** Active  

This document logs confirmed architectural choices, recorded sensible defaults, and unresolved decisions grouped by urgency and decision owner.

---

## 1. Confirmed Decisions & Architectural Directives

| ID | Decision | Rationale | Confirmed In |
| :--- | :--- | :--- | :--- |
| **DEC-01** | **Monetary Unit:** Strict Integer Paise | Avoids IEEE 754 binary floating-point rounding bugs in tax calculations, invoicing, and payment matching. `1 INR = 100 paise`. | SOW & Master Build Plan |
| **DEC-02** | **Brand Identity:** `Snappy Gifts` | Replaces baseline prototype name "Ajmer Gift Charm". Brand name is stored in configuration settings rather than hardcoded. | SOW |
| **DEC-03** | **One Batch = One Git Branch** | Incremental, testable commits on isolated branches merged to `main` only after verified acceptance. | Antigravity Workflow |
| **DEC-04** | **Single Agent Execution** | Prevent runaway token consumption; parallel agents require explicit advance approval. | Antigravity Workflow |
| **DEC-05** | **Independent Payment vs Order Status** | Gateway payments can fail, succeed late, or require retries. Operational order status (`CONFIRMED`, `IN_CUSTOMIZATION`, `DISPATCHED`) is decoupled from financial capture status. | Master Build Plan |
| **DEC-06** | **Idempotent Webhooks with Raw Body** | Webhook replay attacks or duplicate deliveries from payment gateways are deduplicated safely without double-charging or duplicate fulfillment. | Security Rule |
| **DEC-07** | **Coupons Deferred** | Promo coupon codes are excluded from initial batches to streamline checkout stability; schema retains extension point. | Scope Agreement |
| **DEC-08** | **Exclusion of Third-Party Chat & SMS** | WhatsApp widget and SMS gateways are excluded from the current SOW. Transactional updates occur via Email and web tracking. | Scope Agreement |
| **DEC-09** | **Tax Invoice Numbering & FY Rollover** | Invoice numbers use `[PREFIX]/[YY-YY]/[SEQUENCE]` (e.g. `SG/26-27/0001`), strictly under the 16-character limit of CGST Rule 46(b). Determined in `Asia/Kolkata` timezone with 1 April financial year boundary. Powered by atomic sequence table with unique constraint. | Legal / CGST Rule 46(b) |
| **DEC-10** | **Unverified Seller Watermark & Compliance Safeguard** | Sample seller details and GSTINs are non-production placeholders. When `isVerified=false`, invoices carry prominent `SAMPLE / FOR REVIEW ONLY - NOT A LEGAL TAX INVOICE` watermarks. In production mode, tax invoice issuance is strictly blocked until seller legal details are verified AND e-invoicing status is confirmed by an accountant (`eInvoiceStatus !== PENDING_ACCOUNTANT_CONFIRMATION`) with a valid signature mode configured. | Legal / Tax Integrity |
| **DEC-11** | **Packing Slip Financial Leakage Isolation** | Warehouse packing slips omit all unit prices, line totals, grand totals, GST amounts, payment methods, and internal staff notes. They convey only shipping particulars, product names, SKUs, quantities, and personalization instructions. | Operations / Privacy |
| **DEC-12** | **Transactional Email Outbox Isolation** | Email delivery operates through a persistent `EmailOutbox` with unique idempotency keys, worker concurrency locking, and bounded exponential backoff retries. Email failure never rolls back or invalidates payment, order, dispatch, or invoice states. | Resilience / Architecture |
| **DEC-13** | **E-Invoicing Applicability (CGST Rule 48(4) & Rule 46(s))** | In accordance with Section 2(6) of the CGST Act, 2017, e-invoicing applicability is determined strictly by **aggregate annual turnover computed across the entire PAN (all GSTINs in India) in any preceding financial year from FY 2017–18 onwards**, not merely a single GSTIN or current year revenue. To prevent unlawful non-compliance, all unverified assertions that Snappy Gifts is exempt have been removed. System records e-invoice applicability as `PENDING_ACCOUNTANT_CONFIRMATION` until formally verified by an accountant. Admin-managed statuses include `PENDING_ACCOUNTANT_CONFIRMATION`, `EXEMPT_BELOW_THRESHOLD`, `EXEMPT_NOTIFIED_CATEGORY`, and `APPLICABLE`. Where PAN aggregate turnover exceeds ₹5 Crores but an applicable notified exemption applies, the mandatory statutory declaration under CGST Rule 46(s) is printed on the invoice. Furthermore, under Notification No. 13/2020-CT and Rule 48(4), e-invoicing applies specifically to supplies made to registered persons (B2B supplies), exports, and SEZ units; retail B2C consumer supplies to unregistered persons are excluded from IRP IRN generation and are issued as standard Rule 46 tax invoices. Final production invoice issuance is strictly blocked while status remains pending. | Tax / Legal Compliance |
| **DEC-14** | **Mandatory Invoice Issuance Before Dispatch (Section 31(1))** | Under Section 31(1) of CGST Act, 2017, a tax invoice must be issued on or before the removal of goods for supply. The dispatch workflow enforces this timing gate: dispatch cannot complete or transition order status to `DISPATCHED` if tax invoice issuance fails. | Tax / Legal Compliance |
| **DEC-15** | **Transactional Email Delivery Semantics (At-Least-Once)** | Outbox workers process queued emails with atomic leasing, expired lease reclamation, and backoff retries. Standard email providers lack native distributed two-phase commit, resulting in at-least-once delivery guarantees. Schedulers authenticate to `/api/admin/email/process` via `CRON_SECRET` bearer token or administrative session. | Architecture / Reliability |
| **DEC-16** | **Invoice Signature & Electronic Invoice Compliance (Rule 46(q) vs Rule 46(r))** | Under CGST Rule 46(q), an invoice must contain the signature or digital signature of the supplier or authorized representative. An IRN QR code under Rule 46(r) does not automatically bypass Rule 46(q). The platform strictly enforces statutory separation: (1) `PHYSICAL_SIGNATURE_ON_PRINT` (retains formal physical signature area on PDF; requires explicit staff confirmation that invoice was physically printed and signed prior to goods removal/courier dispatch; records confirming staff identifier and timestamp; server-side dispatch transition strictly blocked if confirmation is missing); (2) `DIGITAL_SIGNATURE_IT_ACT` (Class 2/3 Digital Signature Certificate under Section 5 of IT Act 2000; blocks production invoice issuance if DSC token is unconfigured); and (3) `ELECTRONIC_INVOICE_EXCEPTION` / `E_INVOICE_IRP_QR` (applicable Rule 46 second proviso electronic-invoice signature exception under Rule 48(4); strictly blocked unless accountant audit and confirmation is recorded with staff identifier and timestamp). Decorative signatures, fake digital signatures, and invented exemptions are strictly prohibited. | Tax / Legal Compliance |
| **DEC-17** | **Grouped Order Multi-Address Fulfillment Architecture** | The canonical `Order` schema supports one delivery address per order. Rather than mutating standard retail checkout or creating a monolithic order with compromised logistics, corporate multi-address orders are structured as a master `CorporateOrderGroup` linking discrete child `Order` records (`corporateOrderGroupId`). Each child order has its own delivery address, recipient, fulfillment lifecycle, AWB shipment tracking, and GST tax invoice, while strictly reconciling quantities and amounts to the approved quote. | Architecture / Logistics |
| **DEC-18** | **Authoritative Corporate Pricing Hierarchy** | Deterministic four-tier price resolution: (1) Approved `CorporateQuote` line item price snapshot; (2) Active negotiated `CorporatePriceAgreement` quantity tier within effective dates; (3) Standard catalog volume bulk tier (`BulkTier`); (4) Base product/variant catalog unit price in integer paise. | Commercial / Pricing |
| **DEC-19** | **Quotation Revision Invalidation & Approval Integrity** | Issuing a revised quote increments `revisionNumber`, marks prior revisions as superseded (`isCurrent = false`), and invalidates earlier customer approvals. Approvals are strictly restricted to `APPROVER` and `OWNER` corporate roles. An accepted quote's financial amounts and items are immutable. | Governance / B2B Workflow |
| **DEC-20** | **CSV Sanitization & Formula Injection Defense** | All recipient CSV uploads undergo server-side validation against formula injection, stripping leading special characters (`=`, `+`, `-`, `@`, `\t`, `\r`) from string fields. Capped at 5MB and 5,000 rows. PIN codes validated with `^[1-9][0-9]{5}$`. Comprehensive row-by-row error reporting with zero silent row discards. | Security / Data Integrity |

---

## 2. Unresolved Decisions Awaiting Client Approval

### Category A: Immediate Blockers (Must resolve before production launch)

| ID | Decision Item | Recommended Default | Decision Owner | Impact / Blocker Note |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-BLK-01** | **Code & Asset Reuse Authorization** | **Client Confirmation** | Client | The cloned repository lacks a `LICENSE` file. The client must confirm legal ownership or permission to reuse/rebrand existing code and visual assets. |
| **DEC-BLK-02** | **App Router Architecture Gate** | **Approve Next.js Migration** | Client | The SOW mandates SSR and dynamic SEO metadata, requiring migration from Vite SPA to Next.js App Router. The client must formally approve this staged migration path before Batch 1 begins. |
| **DEC-ACC-01** | **Accountant Confirmation of PAN Aggregate Turnover & E-Invoicing Exemption** | **PENDING_ACCOUNTANT_CONFIRMATION** | Chartered Accountant / Tax Counsel | **Hard Production Blocker:** The accountant must audit historical aggregate turnover across the entire PAN in any preceding financial year from FY 2017–18 onwards. The admin must update `SellerConfig.eInvoiceStatus` to `EXEMPT_BELOW_THRESHOLD`, `EXEMPT_NOTIFIED_CATEGORY` (with statutory reason), or `APPLICABLE`. If `APPLICABLE`, real IRP credentials must be provisioned. Production invoice issuance will fail until resolved. |
| **DEC-ACC-02** | **Invoice Authentication & Signature Mechanism Sign-off** | **PHYSICAL_SIGNATURE_ON_PRINT** | Chartered Accountant / Operations Lead | Decide whether warehouse staff will physically sign printed invoices prior to courier dispatch (`PHYSICAL_SIGNATURE_ON_PRINT` with mandatory staff dispatch confirmation), a licensed Class 2/3 DSC token will be installed on the invoice server (`DIGITAL_SIGNATURE_IT_ACT`), or if the accountant formally verifies the statutory electronic invoice signature exception (`ELECTRONIC_INVOICE_EXCEPTION`). Production invoice issuance without valid configured and approved route will fail closed. |

### Category B: Important Configuration (Resolve before Batch 4 & 9A)

| ID | Decision Item | Recommended Default | Decision Owner | Scheduled Batch |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-CFG-01** | **Retail Price Tax Display** | **Implemented: Tax-Exclusive Base Pricing** (Catalog prices are net taxable base; CGST/SGST or IGST is added to derive grand total). Proposal for **Tax-Inclusive MRP** (displaying gross price with back-calculated tax) remains **Awaiting Owner Approval**. | Client / Commercial Lead | Batch 4 (Pricing/Checkout) |
| **DEC-CFG-02** | **Shipping Rate Policy** | **Implemented: Free shipping at/above ₹999** (99,900 paise); flat ₹99 (9,900 paise) below threshold. Configurable via env. Proposal for alternate tiers (₹149/₹1,999) remains **Awaiting Owner Approval**. | Commercial Lead | Batch 4 (Checkout) |
| **DEC-CFG-03** | **Stock Reservation TTL** | **15 Minutes** (Hold inventory upon payment intent initiation; release on timeout). | Ops Lead | Batch 4 (Checkout) |
| **DEC-CFG-04** | **Corporate B2B Payment Terms** | **Implemented: Online Payment Required by Default** (Corporate purchases route through standard payment gateway upon quote acceptance. Net credit terms require explicit admin-vetted agreement). | Finance Lead | Batch 9A (Implemented) |
| **DEC-CFG-05** | **Dealer Portal & MRP Scope** | **Pending Signed Change Request** (Do not build wholesale MRP portal without written change order). | Project Sponsor | Batch 9B (Dealer Scope) |

### Category C: Deferrable Technical Decisions (Resolve before Batch 11 & 12)

| ID | Decision Item | Recommended Default | Decision Owner | Scheduled Batch |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-DEF-01** | **Production Email Provider** | **Resend or AWS SES** (Use Mailpit for local development). | Tech Lead | Batch 8 & 12 |
| **DEC-DEF-02** | **Production File Storage** | **AWS S3 or Cloudflare R2** (Use local protected disk for development). | Tech Lead | Batch 7 & 12 |
| **DEC-DEF-03** | **Courier API Automation** | **Manual AWB Assignment First** (Automated carrier booking deferred until Delhivery/BlueDart live API keys provided). | Logistics Lead | Batch 6 & 12 |
| **DEC-DEF-04** | **Production Cloud Host** | **Vercel / Render** + Managed PostgreSQL (Neon / Supabase). | Tech Lead | Batch 12 |

### Category D: Batch 10 Administrative & Reporting Decisions

| ID | Decision Item | Selected Policy | Impact / Rationale |
| :--- | :--- | :--- | :--- |
| **DEC-B10-01** | **Revenue Recognition Metric Boundary** | **Captured Payments Only** | Only orders with `paymentStatus === 'CAPTURED'` (in integer paise) are counted towards recognized gross revenue in overview KPIs and sales reports. `PENDING` and `AUTHORIZED` payments are tracked separately to prevent revenue inflation. |
| **DEC-B10-02** | **CSV Formula Injection Mitigation** | **OWASP Prefix Neutralization** | All CSV report exports run cells through `sanitizeCsvCell`, prefixing dangerous leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes (`''`) per OWASP CWE-1236, ensuring spreadsheet macro safety. |
| **DEC-B10-03** | **Administrative Account Lockout Guardrails** | **Self-Demotion & Self-Deactivation Prohibition** | Administrators are strictly blocked from demoting themselves from `ADMIN` or deactivating their own administrative user account, preventing accidental platform lockout. |
| **DEC-B10-04** | **Role Change Session Invalidation** | **Immediate Session Revocation** | When a staff or customer account role is updated or deactivated, all active sessions and bearer tokens are immediately deleted via `invalidateAllUserSessions`, forcing re-authentication. |

### Category E: Batch 11 Security, Reliability & Quality Assurance Decisions

| ID | Decision Item | Selected Policy | Impact / Rationale |
| :--- | :--- | :--- | :--- |
| **DEC-B11-01** | **Distributed Rate Limiting Architecture** | **Provider-Independent Upstash Redis Pipeline + Fail-Closed Safety** | Serverless Next.js functions across distributed edge instances cannot rely on Node in-memory maps. Designed provider-independent abstraction in `src/lib/security/rate-limit.ts` using Upstash Redis REST atomic pipelines (`INCR` + `EXPIRE NX` + `TTL`). In production, missing credentials trigger a fail-closed response (429) rather than allowing unmetered brute-force traffic. |
| **DEC-B11-02** | **Deactivated Account OTP Lockout** | **Strict Account Status Validation** | In `/api/auth/otp/verify`, added mandatory check on `user.isActive`. Deactivated or suspended accounts attempting to verify an OTP are immediately rejected with HTTP 403 Forbidden, closing the bypass vulnerability. |
| **DEC-B11-03** | **Corporate Tenant Isolation Enforcement** | **Mandatory Organization Scope Verification** | In `corporate.service.ts`, hardened `getCorporateRFQ`, `getCorporateQuote`, and `getCorporateOrderGroup` to strictly require `userOrgId` for non-staff callers. Missing or mismatched organization identifiers immediately reject with 403 Forbidden. |
| **DEC-B11-04** | **Timing Attack Channel Mitigation** | **Constant-Length Digest Comparison** | In `/api/personalization/uploads/[id]/file/route.ts`, replaced variable-length guest token string comparisons with SHA-256 digests evaluated via `crypto.timingSafeEqual()`, completely eliminating timing side-channels. |

---

## 3. Scope Boundary Enforcement

- **Change Control Policy:** Any feature outside the documented SOW (such as WhatsApp APIs, automated SMS gateways, live customer chat widgets, ERP inventory sync, customer product reviews, or automated customer refunds) requires a formal written Change Request detailing budget and timeline adjustments.
- **Test Integrity Policy:** No test or build check will be reported as passing unless executed directly in the environment and validated by process exit code 0.

