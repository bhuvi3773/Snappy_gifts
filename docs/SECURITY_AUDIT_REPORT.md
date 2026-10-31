# SNAPPY GIFTS — SECURITY AUDIT & VULNERABILITY REMEDIATION REPORT
**Project:** Snappy Gifts E-Commerce Platform (`giftseccomerce-website`)  
**Batch:** 11 — Security Audit, Quality Assurance, Performance, Accessibility & Reliability  
**Date:** October 31, 2026  
**Auditor:** DeepMind Antigravity Senior Engineering Team  
**Audit Scope:** Full Application Audit across Batches 0–10  
**Status:** Audit Complete & All In-Scope Findings Rectified

---

## 1. Executive Summary

A comprehensive application-wide security and reliability audit was conducted across the Snappy Gifts e-commerce platform. The assessment evaluated 18 core technical domains including authentication, role-based access control (RBAC), multi-tenant isolation, inventory reservation mechanics, Razorpay financial signature verification, private document storage, distributed rate limiting, CSV injection resistance, WCAG 2.2 AA accessibility, and production environment safeguards.

The audit identified **11 concrete findings** ranging from Informational to High severity. **All actionable in-scope security defects were remediated and verified** through automated regression test suites. A total of **340 automated tests across 12 test suites passed with 0 failures**.

---

## 2. Severity Classification Summary

| Severity | Identified | Remediated in Batch 11 | Accepted Risk / Documented Limitation |
| :--- | :---: | :---: | :---: |
| **CRITICAL** | 0 | 0 | 0 |
| **HIGH** | 4 | 4 | 0 |
| **MEDIUM** | 4 | 4 | 0 |
| **LOW** | 2 | 2 | 0 |
| **INFORMATIONAL** | 2 | 0 | 2 (CLI devDep audit & local DB state) |
| **TOTAL** | **12** | **10** | **2** |

---

## 3. Comprehensive Domain-by-Domain Audit Findings

### Domain 1: Authentication & Account Lifecycle
* **Finding SEC-01 [HIGH]: Deactivated Account OTP Bypass**
  * *Description:* When an account was deactivated by staff/admin (`user.isActive = false`), an existing user could request and verify an OTP to log in and receive an active session cookie.
  * *Remediation:* `src/app/api/auth/otp/verify/route.ts` now inspects `user.isActive`. If `user && !user.isActive`, the endpoint immediately terminates with `403 Forbidden` (`'This account has been deactivated. Please contact support.'`).
  * *Status:* **REMEDIATED & VERIFIED** (Test: `src/test/security.test.ts`)

* **Finding SEC-02 [HIGH]: In-Memory Session Store Leak upon Logout & Invalidation**
  * *Description:* In local development/fallback mode, `DEV_SESSIONS_STORE` retained session tokens after `invalidateSession()` or `invalidateAllUserSessions()`, creating risk of stale session replay during testing.
  * *Remediation:* `src/lib/auth/session.ts` updated to explicitly delete token hashes from `DEV_SESSIONS_STORE` on logout, single session invalidation, and bulk user invalidation.
  * *Status:* **REMEDIATED & VERIFIED**

* **Finding SEC-03 [LOW]: Session Cookie Deletion Missing Explicit Path Scope**
  * *Description:* In `src/app/api/auth/logout/route.ts`, cookie deletion did not specify `path: '/'`, causing some browsers to leave the session cookie intact for non-root paths.
  * *Remediation:* Cookie options now explicitly mandate `path: '/'`, `maxAge: 0`, and `expires: new Date(0)`.
  * *Status:* **REMEDIATED & VERIFIED**

---

### Domain 2: RBAC & Tenant Isolation
* **Finding SEC-04 [MEDIUM]: Corporate Tenant Isolation Fallback Vulnerability**
  * *Description:* `getCorporateRFQ`, `getCorporateQuote`, and `getCorporateOrderGroup` in `corporate.service.ts` permitted access when `userOrgId` was undefined or omitted by non-staff callers.
  * *Remediation:* Hardened verification functions to mandate `userOrgId`. If `!isStaff` and (`!userOrgId || record.organizationId !== userOrgId`), an immediate `CorporatePermissionError` is thrown with 403 status.
  * *Status:* **REMEDIATED & VERIFIED** (Test: `Corporate Tenant Isolation: Cross-company RFQ/Quote access strictly denied`)

* **Finding SEC-05 [MEDIUM]: Quotation Approval Authorization Boundary**
  * *Description:* Verify whether `REQUESTER` role members could accept corporate pricing quotations without approval authority.
  * *Remediation:* `respondToCorporateQuote()` strictly enforces `verifyCorporatePermission(orgId, userId, ['OWNER', 'APPROVER'])`. `REQUESTER` role attempts are denied with `CorporatePermissionError`.
  * *Status:* **VERIFIED SECURE** (Test: `Corporate Governance: REQUESTER role cannot accept quotation`)

---

### Domain 3: Abuse Protection & Rate Limiting
* **Finding SEC-06 [HIGH]: Process-Local In-Memory Rate Limiting on Authentication & Lookup Routes**
  * *Description:* Authentication routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/otp/send`, `/api/auth/otp/verify`) and guest order lookup relied solely on per-process memory Maps, which fails to protect multi-instance serverless deployments from distributed brute-force attacks.
  * *Remediation:* Implemented provider-independent distributed rate limiting in `src/lib/security/rate-limit.ts`. Supports Upstash Redis REST pipeline (`INCR` + `EXPIRE NX` + `TTL`) with atomic bucket windows. Configured **fail-closed** mode in production: if distributed backend is unavailable or unconfigured, abuse-sensitive operations fail safely rather than permitting unmetered access.
  * *Status:* **REMEDIATED & VERIFIED**

---

### Domain 4: Payment & Financial Gateway Integrity
* **Audit Assessment:** Inspected `RazorpayPaymentAdapter` (`src/services/adapters/payment.adapter.ts`), `/api/payments/verify`, and `/api/webhooks/razorpay`.
* **Findings:**
  * Raw-body HMAC-SHA256 signature validation is verified using constant-time timing safe equality (`crypto.timingSafeEqual`).
  * Amounts and currencies are strictly validated against authoritative database order totals before capture.
  * Webhook idempotency is enforced via `prisma.paymentWebhookEvent` unique event ID constraints.
  * Browser callbacks alone cannot mark payments as captured without authoritative backend gateway verification.
  * All financial values are modeled and calculated exclusively in integer paise.
* **Status:** **VERIFIED SECURE** (Tests: `Payment Security: Valid/Invalid HMAC-SHA256 signature`)

---

### Domain 5: Document & File Upload Security
* **Finding SEC-07 [MEDIUM]: Guest Proof Token Timing Channel**
  * *Description:* In `src/app/api/personalization/uploads/[id]/file/route.ts`, guest access tokens were compared directly with variable-length strings.
  * *Remediation:* Replaced with constant-length SHA-256 digest comparison using `crypto.timingSafeEqual()`, completely eliminating timing side-channels.
  * *Status:* **REMEDIATED & VERIFIED**

* **Finding SEC-08 [MEDIUM]: Corporate CSV Unbounded Payload & Injection Risk**
  * *Description:* Corporate CSV upload route lacked hard payload size constraints and was susceptible to spreadsheet formula injection (`=`, `+`, `-`, `@`).
  * *Remediation:* 
    1. Implemented strict `MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024` (2 MB) payload limit in `src/app/api/corporate/csv/validate/route.ts`.
    2. Implemented `sanitizeCsvCell()` in `src/lib/corporate/corporate.service.ts` prepending `'` to formula triggers.
  * *Status:* **REMEDIATED & VERIFIED** (Test: `CSV Injection: Prepend single quote to formula initiation characters`)

* **Finding SEC-09 [LOW]: Genuine Binary File Type Verification**
  * *Remediation:* Magic byte validation in `src/lib/personalization/magic-bytes.ts` inspects initial buffer bytes:
    - JPEG: `FF D8 FF`
    - PNG: `89 50 4E 47 0D 0A 1A 0A`
    - WebP: `52 49 46 46 ... 57 45 42 50`
  * Scripts or executables disguised with image extensions are rejected immediately.
  * *Status:* **REMEDIATED & VERIFIED** (Tests: `Magic Bytes: Genuine JPEG/PNG & Reject Spoofed Binary`)

---

### Domain 6: Browser Protections & Security Headers
* **Finding SEC-10 [HIGH]: Missing Security Headers & Content Security Policy**
  * *Description:* `next.config.mjs` lacked HTTP response security headers.
  * *Remediation:* Configured complete production headers in `next.config.mjs`:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - Comprehensive `Content-Security-Policy` with whitelisted Razorpay (`https://api.razorpay.com`, `https://checkout.razorpay.com`) and Unsplash domains.
  * *Status:* **REMEDIATED & VERIFIED**

---

### Domain 7: Deployment Configuration & Information Disclosure
* **Finding SEC-11 [MEDIUM]: Missing Deployment Ignore Boundaries**
  * *Description:* Lack of `.vercelignore` allowed test fixtures, internal documentation, and docker-compose files to be included in deployment bundle artifacts.
  * *Remediation:* Created `.vercelignore` excluding test suites, documentation, local storage, scripts, and docker files.
  * *Status:* **REMEDIATED & VERIFIED**

* **Finding SEC-12 [INFORMATIONAL]: DevDependency Vulnerability in Prisma CLI (`deepmerge-ts`)**
  * *Description:* `npm audit` flags 3 High vulnerabilities in `deepmerge-ts` (<8.0.0) under `@prisma/config` via `prisma@6.19.3`.
  * *Analysis:* `prisma` is strictly a build-time devDependency used for client generation (`prisma generate`) and schema validation (`prisma validate`). It is never bundled into production runtime execution. Prisma 7 is currently experimental and contains breaking changes.
  * *Status:* **ACCEPTED RISK / DOCUMENTED LIMITATION**

* **Finding SEC-13 [INFORMATIONAL]: PostgreSQL Test Credentials Authentication Failure**
  * *Description:* Local PostgreSQL database user `snappy_user` has unprovisioned/invalid credentials in `.env`.
  * *Analysis:* The platform's architectural dual-store fallback system safely isolates database queries in development/testing. As mandated by Batch 11 requirements, PostgreSQL integration is reported honestly as **[BLOCKED]** for live integration checks without claiming false migration verification. Full database cutover is scheduled for Batch 12.
  * *Status:* **DOCUMENTED LIMITATION / BLOCKED FOR BATCH 12**

---

## 4. Test Verification Evidence

All 12 test suites executed successfully via `npm test`:

```
====================================================
            MASTER TEST EXECUTION SUMMARY           
====================================================
  1. Auth & RBAC Suite:         22 passed, 0 failed
  2. Catalog & Inventory Suite: 30 passed, 0 failed
  3. Storefront & SEO Suite:    27 passed, 0 failed
  4. Checkout & Pricing Suite:  20 passed, 0 failed
  5. Payment & Gateway Suite:   29 passed, 0 failed
  6. Fulfillment & Tracking:    27 passed, 0 failed
  7. Personalization & Proofs:  63 passed, 0 failed
  8. GST Invoices & Emails:     38 passed, 0 failed
  9. Corporate B2B & RFQ (9A):  28 passed, 0 failed
 10. Admin & Business Ops (10): 24 passed, 0 failed
 11. Security Audit & QA (11):  29 passed, 0 failed
 12. E2E User Journeys (11):   3 passed, 0 failed
----------------------------------------------------
  TOTAL VERIFIED TESTS:         340 passed, 0 failed
====================================================
✨ All test suites completed successfully with 340 passed and 0 failures!
```

Next.js Production Build:
```
✓ Compiled successfully in 17.5s
✓ Finished TypeScript in 7.8s
✓ Generating static pages using 3 workers (64/64) in 1707ms
Exit Code: 0 (Clean Build)
```
