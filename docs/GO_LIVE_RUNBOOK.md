# Snappy Gifts — Go-Live Operational Runbook & Cutover Plan

**Document Version:** 1.0 (Baseline Batch 0)  
**Target:** Staging & Production Deployment (Scheduled Batch 12)  
**Security Mandate:** Contains **zero** real secrets, passwords, or production credentials.

---

## 1. Environment Variable Audit & Verification

All production values must be provisioned directly inside hosting provider dashboard secrets or secure secret managers. Never commit real credentials to Git.

| Variable Name | Environment | Purpose & Format Description | Secret? |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | All | `production` or `development` | No |
| `NEXTAUTH_URL` / `APP_URL` | All | Canonical public HTTPS URL (e.g. `https://snappygifts.in`) | No |
| `NEXTAUTH_SECRET` | Prod/Staging | 32+ character cryptographically secure random string | **YES** |
| `DATABASE_URL` | Prod/Staging | PostgreSQL connection string (`postgresql://user:pass@host:5432/db?sslmode=require`) | **YES** |
| `DIRECT_URL` | Prod/Staging | Non-pooled direct database URL for Prisma migrations | **YES** |
| `RAZORPAY_KEY_ID` | Prod/Staging | Razorpay Public Key (`rzp_live_...` or `rzp_test_...`) | No |
| `RAZORPAY_KEY_SECRET` | Prod/Staging | Razorpay Secret Key for server order creation | **YES** |
| `RAZORPAY_WEBHOOK_SECRET` | Prod/Staging | Secret key used to verify raw body webhook HMAC signature | **YES** |
| `SMTP_HOST` | Prod/Staging | Transactional email SMTP host (e.g., `smtp.resend.com`) | No |
| `SMTP_PORT` | Prod/Staging | Port `587` or `465` | No |
| `SMTP_USER` | Prod/Staging | SMTP username / API key identity | No |
| `SMTP_PASS` | Prod/Staging | SMTP password / API token | **YES** |
| `EMAIL_FROM` | Prod/Staging | Sender address (e.g., `orders@snappygifts.in`) | No |
| `STORAGE_BUCKET` | Prod/Staging | S3 or Cloudflare R2 bucket name for proofs/logos | No |
| `STORAGE_ACCESS_KEY` | Prod/Staging | IAM Access Key ID for cloud storage | **YES** |
| `STORAGE_SECRET_KEY` | Prod/Staging | IAM Secret Key for cloud storage | **YES** |
| `CRON_SECRET` | Prod/Staging | Bearer token for automated cron workers calling `/api/admin/email/process` | **YES** |

---

## 2. Pre-Cutover Verification Checklist

### 2.1 Legal & Commercial Prerequisites
- [ ] Registered business entity legal name confirmed (`Snappy Gifts`).
- [ ] Official Indian GSTIN and registered principal address verified with tax counsel.
- [ ] State code confirmed for tax logic (`08` Rajasthan for intra-state CGST/SGST; inter-state IGST).
- [ ] Sequential tax invoice numbering format approved (`SG/YY-YY/NNNN`, e.g. `SG/26-27/0001` - Rule 46(b) 16-character limit).
- [ ] Admin Seller Configuration (`SellerConfig`) updated and marked `isVerified = true` in admin portal. Final tax invoice generation is strictly blocked in production until this legal verification is complete.
- [ ] **E-Invoicing Applicability (CGST Rule 48(4) & Rule 46(s)):**
  - [ ] Chartered Accountant / Tax Counsel audited PAN-level aggregate turnover across all GSTINs in any preceding financial year from FY 2017–18 onwards (CGST Section 2(6)).
  - [ ] Admin updated `SellerConfig.eInvoiceStatus` from `PENDING_ACCOUNTANT_CONFIRMATION` to accountant-approved determination:
    - `EXEMPT_BELOW_THRESHOLD` if PAN turnover did not exceed ₹5 Crores in any preceding FY from 2017-18 onwards (`panAggregateTurnoverExceeds5Cr = false`).
    - `EXEMPT_NOTIFIED_CATEGORY` if PAN turnover exceeds ₹5 Crores but entity qualifies for a statutory exemption (e.g. SEZ Unit under Notification No. 13/2020-CT), recording `eInvoiceExemptionReason` and enabling Rule 46(s) declaration.
    - `APPLICABLE` if e-invoicing is mandatory under Rule 48(4), with IRP portal integration and authentic IRN/signed QR generation provisioned.
  - [ ] **Hard Gate:** Confirm `eInvoiceStatus !== 'PENDING_ACCOUNTANT_CONFIRMATION'`. Production tax invoice issuance is strictly blocked while pending.
- [ ] **Invoice Signature Compliance (CGST Rule 46(q) vs Rule 46(r)):**
  - [ ] Authenticated signing mechanism selected and verified:
    - `PHYSICAL_SIGNATURE_ON_PRINT`: Operational procedures documented and warehouse dispatch staff trained to affix physical signature to printed invoice before packing. Explicit staff confirmation (`invoicePhysicalSignatureConfirmed = true`) is required server-side prior to goods removal/courier dispatch; missing confirmation blocks dispatch.
    - `DIGITAL_SIGNATURE_IT_ACT`: Class 2/3 Digital Signature Certificate (DSC) licensed under Section 5 of IT Act 2000 provisioned on invoice server with `digitalSignatureConfigured = true`.
    - `ELECTRONIC_INVOICE_EXCEPTION` / `E_INVOICE_IRP_QR`: Applicable Rule 46 second proviso electronic-invoice signature exception under Rule 48(4), requiring formal accountant confirmation (`electronicInvoiceSignatureExemptionConfirmed = true`) with recorded staff identifier and timestamp. An IRN QR code under Rule 46(r) does not automatically bypass Rule 46(q) without accountant sign-off.
  - [ ] **Hard Gate:** Production issuance with unconfigured digital signature, unconfirmed electronic exemption, or missing physical signature dispatch confirmation is strictly blocked.
- [ ] Customer terms of service, privacy policy, and shipping/cancellation policies published.

### 2.2 Payment Gateway Activation (Razorpay)
- [ ] Razorpay Merchant Account fully KYC verified and activated for live transactions.
- [ ] Sandbox mode test order executed, authorized, captured, and validated in staging.
- [ ] Production Webhook endpoint registered (`https://snappygifts.in/api/webhooks/razorpay`) with events:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`
- [ ] Live API keys swapped into production hosting secrets.
- [ ] Live ₹1.00 end-to-end smoke test executed and captured successfully.

### 2.3 Email Infrastructure, Deliverability & Scheduler
- [ ] Transactional domain (`snappygifts.in`) configured with DNS records:
  - SPF record (`v=spf1 include:... ~all`)
  - DKIM CNAME records verified
  - DMARC policy record (`v=DMARC1; p=quarantine; ...`)
- [ ] Production SMTP credentials configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).
- [ ] External scheduler / cron job configured to regularly trigger `POST /api/admin/email/process` (e.g. every 1-5 minutes) with administrative bearer token or service header to process the `EmailOutbox` queue and retry failed messages.
- [ ] Order confirmation, dispatch alert with tracking, and invoice availability emails tested end-to-end.

### 2.4 Cloud Storage & Asset Security
- [ ] Cloud storage bucket permissions set to **Private** (no public bucket listing).
- [ ] Customer personalization proofs served only via short-lived pre-signed URLs or protected stream handlers.
- [ ] Upload size limit capped at 10 MB per file with server-side MIME type verification.

### 2.5 Corporate B2B Portal & Multi-Address Safeguards (Batch 9A)
- [ ] Verify corporate registration workflow requires explicit Admin/Staff approval (`APPROVED` status) before quoting or discounted ordering is unlocked.
- [ ] Verify corporate membership RBAC prevents non-approver roles (`REQUESTER`, `FINANCE`) from accepting binding quotations without explicit authorization.
- [ ] Confirm CSV recipient upload validation limits (5MB file size, 5,000 max rows) and verify formula injection character filtering (`=`, `+`, `-`, `@`, `\t`, `\r`) is active.
- [ ] Audit corporate negotiated price agreements (`CorporatePriceAgreement`) to ensure valid `effectiveFrom` and `effectiveTo` dates, active flags, and admin attribution.
### 2.6 Admin Operations, System Health & Reporting Verification (Batch 10)
- [ ] Log in with an `ADMIN` account and verify access to all 12 navigation tabs in `/admin`.
- [ ] Inspect the **System Health & Operations** tab (`/api/admin/system/health`) to confirm:
  - Database connectivity status and query latency.
  - SMTP provider connectivity and sender address configuration.
  - Private cloud storage adapter availability.
  - Environment security variables checklist (confirm presence of all required variables without values being leaked).
  - Background worker scheduler status for outbox processing and artwork cleanup.
- [ ] Verify **Business Settings** (`/api/admin/settings`):
  - Standard shipping fee (₹99 default), express fee (₹199), and free shipping threshold (₹999 default).
  - Low stock warning threshold (100 units default).
  - Bespoke personalization file size limits (5 MB default) and wooden crate surcharge (₹150 default).
- [ ] Confirm **Audit Trail Integrity**:
  - Perform an administrative setting update or user role update and verify that an entry is recorded in `AuditLog` with actor attribution, entity ID, and sensitive credentials/tokens redacted.
- [ ] Verify **Business Intelligence & Tax Reports** (`/api/admin/reports/*`):
  - Download sample Sales, Orders, Inventory, and Tax CSV reports.
  - Confirm OWASP formula injection protection (`sanitizeCsvCell`) is active and cells with leading `=`, `+`, `-`, `@` are safely prefixed with single quotes.

### 2.7 Security, Rate Limiting & Accessibility Gates (Batch 11)
- [ ] **Distributed Rate Limiter Backend Provisioning:**
  - [ ] Upstash Redis instance created and credentials added to production environment: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_BACKEND=upstash`.
  - [ ] Verify fail-closed behavior: in production, missing credentials or cluster outage must safely reject brute-force auth requests with HTTP 429 rather than falling back silently to unmetered memory.
- [ ] **Production Security Headers Verification:**
  - [ ] Test live HTTPS response headers to confirm active enforcement of:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy` with whitelisted Razorpay gateway and image domains.
- [ ] **Deactivated Account Lockout Verification:**
  - [ ] Verify that suspended or deactivated user accounts cannot bypass lockout via OTP authentication (`403 Forbidden`).
- [ ] **Cross-Device Accessibility & Keyboard Navigation:**
  - [ ] Confirm modal dialogs expose `role="dialog"`, `aria-modal="true"`, visible focus indicators, and screen-reader status announcements.
- [ ] **Disaster Recovery & Operational Runbooks:**
  - [ ] Review `docs/SECURITY_AUDIT_REPORT.md`, `docs/QA_TEST_STRATEGY.md`, and `docs/BACKUP_RECOVERY_RUNBOOK.md` with engineering on-call rotation.

---

## 3. Database Migration & Rollback Runbook

### 3.1 Applying Migrations
1. Verify database connectivity:
   ```bash
   npx prisma migrate status
   ```
2. Execute pending migrations on staging/production:
   ```bash
   npx prisma migrate deploy
   ```
3. Run baseline seed script (seed categories, initial admin role, settings):
   ```bash
   npx prisma db seed
   ```

### 3.2 Rollback Procedure
1. If a migration fails during deployment, capture migration logs immediately:
   ```bash
   npx prisma migrate status > migration_error.log
   ```
2. If schema is corrupted, restore the point-in-time PostgreSQL snapshot captured immediately prior to the cutover window.
3. Mark migration as resolved once corrected:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

---

## 4. Disaster Recovery & Backup Plan

1. **Automated Daily Backups:** Managed PostgreSQL automated snapshots scheduled daily at 02:00 AM IST with 30-day point-in-time retention.
2. **Weekly Backup Verification:** On a weekly basis, restore the latest backup into an isolated test database to verify database integrity.
3. **Recovery Time Objective (RTO):** < 1 hour.
4. **Recovery Point Objective (RPO):** < 15 minutes.

---

## 5. User Acceptance Testing (UAT) Sign-Off Criteria

Before public DNS cutover, the platform must successfully complete these end-to-end user journeys in staging:

1. **B2C Retail Journey:**
   - Browse catalog, filter by occasion, customize a gold-rim mug with live text, verify PIN code delivery estimate, add to bag, checkout via Razorpay test payment, receive order confirmation email with GST breakdown, verify order status in tracking modal.
2. **B2B Corporate Journey:**
   - Register corporate organization, submit RFQ with bulk quantity tier, admin approves quote with negotiated rate, upload multi-recipient CSV spreadsheet, validate error-free row parsing, generate master order with individual split child AWBs.
3. **Admin Fulfillment Journey:**
   - Login to protected admin panel, view new order, inspect personalized proof artwork, advance order through state machine (`IN_CUSTOMIZATION` → `DISPATCHED`), assign courier tracking AWB, download official GST tax invoice PDF.
