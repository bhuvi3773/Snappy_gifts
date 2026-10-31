# SNAPPY GIFTS — ADMIN OPERATIONAL MANUAL & STANDARD OPERATING PROCEDURES (SOP)

**Document Version:** 1.0.0  
**Target Release:** Production Phase 1  
**Classification:** Internal Operations & Training Manual  
**Author:** Snappy Gifts Engineering & Compliance Team  
**Governing Laws & Standards:** Indian Information Technology Act 2000, Central Goods and Services Tax Act 2017 (Rule 46), OWASP Top 10 API Security  

---

## TABLE OF CONTENTS
1. [Admin Dashboard User Guide](#1-admin-dashboard-user-guide)
2. [Product and Catalogue Management Guide](#2-product-and-catalogue-management-guide)
3. [Inventory and Stock Adjustment Guide](#3-inventory-and-stock-adjustment-guide)
4. [Order Processing and Fulfillment SOP](#4-order-processing-and-fulfillment-sop)
5. [Personalization and Proof Approval SOP](#5-personalization-and-proof-approval-sop)
6. [Corporate Accounts and RFQ Management Guide](#6-corporate-accounts-and-rfq-management-guide)
7. [Quotation and Pricing Administration Guide](#7-quotation-and-pricing-administration-guide)
8. [GST and Invoice Operations Guide](#8-gst-and-invoice-operations-guide)
9. [Email Monitoring and Retry Guide](#9-email-monitoring-and-retry-guide)
10. [Business Settings Administration Guide](#10-business-settings-administration-guide)
11. [Reports and CSV Export Guide](#11-reports-and-csv-export-guide)
12. [User Roles and Permission Reference](#12-user-roles-and-permission-reference)
13. [Operational Troubleshooting Guide](#13-operational-troubleshooting-guide)
14. [Backup and Recovery Operational Instructions](#14-backup-and-recovery-operational-instructions)

---

## 1. ADMIN DASHBOARD USER GUIDE

### 1.1 Overview & Access
The Snappy Gifts administrative console is located at `/admin` (or through the administrative toggle in the header for authenticated staff). Access is restricted to accounts with roles `STAFF` or `ADMIN`. Unauthenticated users or retail customers attempting access will receive an HTTP 403 Forbidden response.

### 1.2 Unified 12-Tab Administrative Navigation
The dashboard centralizes all retail and B2B operational concerns across twelve dedicated functional panels:
1. **Overview:** Executive KPI telemetry, real-time revenue distinction, fulfillment pipeline tracker, best-selling gifts, and recent audit activity feed.
2. **Orders:** Full lifecycle order inspection, customer details, line items, status transitions, fulfillment documents, and carrier assignment.
3. **Inventory:** Real-time stock visibility, SKU level tracking, low-stock alerts, and manual inventory adjustments.
4. **Quotations & Corporate:** Management of corporate accounts, RFQ reviews, formal quotation issuance, pricing agreements, and multi-address order groups.
5. **Users & Staff:** User list, account activation/deactivation, role management, and RBAC governance.
6. **Reports & BI:** Sales aggregation, state-wise orders breakdown, inventory valuation, and GST tax invoice summaries with formula-injection-safe CSV export.
7. **Business Settings:** Store general preferences, shipping rates, free shipping thresholds, low stock warning thresholds, and packaging surcharges.
8. **Seller Legal & GST:** Statutory seller identity, trade name, GSTIN, PAN, registered office address, and authorized signatory configurations.
9. **Email Outbox:** Transactional email queue status, error diagnostics, and manual retry controls.
10. **Audit Logs:** Immutable audit log feed, action filtering, actor tracking, and metadata payload inspector.
11. **System Health:** Read-only infrastructure diagnostics (Database, SMTP, Object Storage, Masked Environment Configuration, and Schedulers).
12. **Support Tickets:** Customer service inquiries, order support tickets, and staff response dispatch.

### 1.3 Key Operational Metrics & Revenue Distinction
- **Captured Revenue:** Represents funds authoritatively received in Indian Rupees (paise integer precision) where `paymentStatus === 'CAPTURED'`. This is the only figure counted towards recognized gross sales.
- **Pending/Authorized Revenue:** Tracked independently to avoid gross revenue inflation. Represents checkout sessions in `PENDING` or `AUTHORIZED` state awaiting capture or webhook confirmation.
- **Fulfillment Pipeline Telemetry:** Displays order counts across `CONFIRMED`, `IN_CUSTOMIZATION`, `QUALITY_CHECK`, `DISPATCHED`, and `DELIVERED`.

---

## 2. PRODUCT AND CATALOGUE MANAGEMENT GUIDE

### 2.1 Product Catalog Hierarchy
The catalogue is organized by primary categories (e.g., *Festive Hampers*, *Laser Engraved Keepsakes*, *Corporate Executive Gifts*) and celebratory occasions (e.g., *Diwali*, *Corporate Milestones*, *Weddings*).

### 2.2 Adding and Editing Gift Products
Staff can configure:
- **Title & URL Slug:** SEO-friendly identifiers unique across the catalogue.
- **HSN Code:** Harmonized System of Nomenclature code (e.g., `4421` for wooden gift boxes, `9405` for engraved candles) for statutory GST computation.
- **Tax Rate (%):** Standard GST rates (18%, 12%, 5%, or 0%) applied on the base price.
- **Pricing:** Base price in Indian Rupees with internal storage in integer paise.
- **Personalization Capability:** Boolean flags indicating if the product supports bespoke text inscriptions, ribbon color selection, or customer artwork file uploads.
- **Packaging Compatibility:** Premium gift box style options, calligraphic cards, and wooden crate protective packaging.

### 2.3 Product Imagery Guidelines
- Maximum file size: 5 MB per image.
- Supported image formats: JPEG, PNG, WebP.
- Recommended dimensions: 1200 x 1200 pixels with neutral or luxury styled backgrounds.

---

## 3. INVENTORY AND STOCK ADJUSTMENT GUIDE

### 3.1 Low-Stock & Out-of-Stock Alerting
- Products with stock below the configurable threshold (`lowStockThreshold`, default 100 units) trigger a visible amber warning on the Overview and Inventory tabs.
- Items at 0 units automatically transition to `OUT_OF_STOCK`, disabling retail checkout unless backorders are explicitly authorized by an Administrator.

### 3.2 Inventory Adjustment Procedure
1. Navigate to the **Inventory** tab.
2. Search for the target SKU or product title.
3. Click **Adjust Stock**.
4. Enter the adjustment quantity (+ for warehouse inward receipts, - for damaged goods or quality rejections).
5. Provide a mandatory reason code (*PO Receipt*, *Damaged in Transit*, *Sample Sent*, *Stocktake Audit Correction*).
6. Confirm adjustment. The system records an immutable audit log linking the staff member ID to the SKU change.

---

## 4. ORDER PROCESSING AND FULFILLMENT SOP

### 4.1 Order Lifecycle State Machine
Orders transition strictly through the following sequential states:
```
PENDING (Payment initiated)
   │
   ▼
CONFIRMED (Payment CAPTURED)
   │
   ▼
IN_CUSTOMIZATION (Laser engraving, gift assembly, bespoke card printing)
   │
   ▼
QUALITY_CHECK (Staff inspection of personalization & physical invoice signing)
   │
   ▼
DISPATCHED (Handed to courier partner with generated AWB number)
   │
   ▼
DELIVERED (Confirmed by carrier tracking webhook or delivery receipt)
```

### 4.2 Dispatch Courier Handover Procedure
Before goods leave the Ajmer Central Gifting Hub:
1. Open the order in the **Orders** tab.
2. Select **Assign Courier & Dispatch**.
3. Choose the assigned Carrier Partner (`BlueDart Air Express`, `Delhivery Surface Express`, `DTDC Premium`, `Shadowfax Local Delivery`, or `India Post Speed Post`).
4. Enter the official Airway Bill (**AWB**) tracking number.
5. Provide the public tracking URL (must begin with `https://`).
6. **Mandatory Compliance Checkbox:** Staff must confirm: *"Physical Tax Invoice Signed (CGST Rule 46(q))"*. Goods MUST NOT be handed over without a physically signed invoice attached in the packing pouch.
7. Click **Confirm & Dispatch**. The order status updates to `DISPATCHED`, and an automated shipment dispatch email with tracking links is enqueued to the customer.

---

## 5. PERSONALIZATION AND PROOF APPROVAL SOP

### 5.1 Inscription & Bespoke Specs Verification
For orders containing customized gifts:
- Inscription text, font selection, and card messages are displayed under the line item in Order Details.
- Staff must check character length, spelling, and special glyphs against the customer's order specifications.

### 5.2 Customer Artwork File Inspection
1. If the customer uploaded vector or raster artwork (e.g., corporate logo or couple silhouette), click **Inspect Customer Artwork File**.
2. The artwork file is opened via a secure, authenticated storage link.
3. Check resolution, aspect ratio, and contrast suitable for laser engraving or UV color printing.
4. If acceptable, click **Verify Artwork** to transition proof status to `ARTWORK_VERIFIED_BY_STAFF`.
5. If the file is blurry, corrupt, or unprintable, click **Rework** to notify the customer and request a high-resolution vector replacement.

### 5.3 Retention & Automated Cleanup
Unattached customer artwork files that are not linked to a confirmed order are retained for 7 calendar days before automated scheduled purging to comply with data minimization principles.

---

## 6. CORPORATE ACCOUNTS AND RFQ MANAGEMENT GUIDE

### 6.1 B2B Organization Onboarding
When an enterprise client submits an application via `/corporate/register`:
1. Navigate to **Quotations & Corporate** -> **Accounts**.
2. Inspect the company name, corporate domain email, GSTIN, PAN, and billing address.
3. Verify GSTIN validity on the GST Portal.
4. Click **Approve Organization** or **Reject Organization** (with a documented operational reason).
5. Approval assigns the user `B2B_CLIENT` privileges, permitting RFQ submissions and multi-destination checkout.

### 6.2 Managing Request for Quotations (RFQs)
- Staff review line items, requested quantities, required delivery dates, and custom branding requirements.
- RFQ statuses: `SUBMITTED` -> `UNDER_REVIEW` -> `QUOTED` -> `ACCEPTED` / `REJECTED`.

---

## 7. QUOTATION AND PRICING ADMINISTRATION GUIDE

### 7.1 Formal Quotation Issuance
1. Open the RFQ under **Corporate RFQs**.
2. Click **Prepare Formal Quotation**.
3. Set the agreed discount percentage or SKU unit override price.
4. Set the validity period (standard: 14 calendar days).
5. Enter payment credit terms (e.g., *Net 30*, *50% Advance / 50% on Dispatch*).
6. Issue quote. The quote transitions to `ISSUED` and an automated quotation email is delivered to the corporate account owner.

### 7.2 Quote Revisions
If the enterprise client requests quantity modifications:
- Click **Revise Quote**.
- The existing quote is superseded (`SUPERSEDED`), and a new revision (e.g., `REV-2`) is generated while maintaining audit history.

---

## 8. GST AND INVOICE OPERATIONS GUIDE

### 8.1 Statutory Invoice Generation
- Invoices are automatically numbered sequentially according to the configured prefix (e.g., `SG/26-27/0001`).
- Taxes are partitioned strictly by place of supply:
  - **Intrastate (Rajasthan to Rajasthan, State Code 08):** 9% CGST + 9% SGST.
  - **Interstate (Rajasthan to any other State/UT):** 18% IGST.
- Prices are rounded and stored in integer paise.

### 8.2 Privacy-Compliant Packing Slips
- For gift orders, packing slips generated for the parcel exterior pouch contain recipient name, address, line item names, and custom gift messages, but **STRICTLY ZERO price, discount, or tax disclosures** to maintain gifting courtesy and privacy.

---

## 9. EMAIL MONITORING AND RETRY GUIDE

### 9.1 Transactional Outbox Pipeline
All automated transactional emails (*Order Confirmation*, *Artwork Proof Verified*, *Shipment Dispatched*, *Corporate Quotation Issued*, *Tax Invoice Issued*) are persisted in the `EmailOutbox` store before dispatch.

### 9.2 Handling Failed Dispatches
1. Navigate to **Email Outbox** in the administrative dashboard.
2. Filter for status `FAILED`.
3. Review the `lastError` column (e.g., *Connection timeout*, *Invalid recipient domain*).
4. After correcting network or SMTP configurations, click **Retry Failed Emails** to execute an immediate worker retry cycle.
5. In development and staging environments without an active SMTP server, the system automatically falls back to local simulation without crashing.

---

## 10. BUSINESS SETTINGS ADMINISTRATION GUIDE

### 10.1 Configurable Platform Preferences
Only users with role `ADMIN` have write access to platform settings:
- **General Identity:** Store Name, Support Email, Support Phone, Headquarters Address, Operating Hours.
- **Logistics & Delivery:** Standard Shipping Fee (default ₹99), Express Shipping Fee (default ₹199), Free Shipping Order Threshold (default ₹999).
- **Inventory Thresholds:** Default Low-Stock Trigger (100 units), Auto-notify low stock toggle.
- **Personalization Policies:** Maximum file upload limit (default 5 MB), Wooden Crate surcharge (₹150).

### 10.2 Audit Integrity & Security Validation
- All updates require positive numbers for shipping and packaging charges.
- Email addresses must conform to valid format rules.
- Any modification generates a `STORE_CONFIG_UPDATE` audit record capturing the updating admin ID and changed attributes.

---

## 11. REPORTS AND CSV EXPORT GUIDE

### 11.1 Standard Financial & Operational Reports
1. **Sales Report:** Captured orders count, gross captured revenue, pending payment volume, AOV, and category/product sales breakdowns.
2. **Orders Report:** Pipeline status breakdown, state-by-state geographic distribution, and fulfillment velocity metrics.
3. **Inventory Report:** Total stock units in warehouse, inventory valuation at retail, and low-stock SKU roster.
4. **Tax & Invoicing Report:** Total taxable value, CGST, SGST, IGST totals, and pending physical invoice signing counts.

### 11.2 CSV Export & Formula Injection Defense
When downloading CSV reports, the platform neutralizes spreadsheet formula injection vectors (OWASP CWE-1236):
- Any cell whose string value begins with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single quote (`''`) to ensure spreadsheet applications treat the content purely as text rather than executable macro commands.

---

## 12. USER ROLES AND PERMISSION REFERENCE

### 12.1 RBAC Permission Matrix

| Operation / Endpoint | CUSTOMER | B2B_CLIENT | STAFF | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Browse Catalogue & Checkout Retail | ✅ | ✅ | ✅ | ✅ |
| Upload Bespoke Artwork & Approve Proofs | ✅ (Own) | ✅ (Own) | ✅ (All) | ✅ (All) |
| Submit Corporate RFQs | ❌ | ✅ | ✅ | ✅ |
| View Order Management & Update Fulfillment Status | ❌ | ❌ | ✅ | ✅ |
| Inspect & Approve Personalization Artwork | ❌ | ❌ | ✅ | ✅ |
| Access Inventory Adjustments | ❌ | ❌ | ✅ | ✅ |
| View Business Intelligence & Tax Reports | ❌ | ❌ | ✅ | ✅ |
| Modify User Roles & Account Status | ❌ | ❌ | ❌ | ✅ |
| Update Store Settings & Business Config | ❌ | ❌ | ❌ | ✅ |
| Update Seller Statutory GST & Legal Identity | ❌ | ❌ | ❌ | ✅ |

### 12.2 Privilege Escalation Protections
- **Self-Demotion Guard:** Administrators cannot demote themselves from `ADMIN` to prevent orphan lockouts.
- **Self-Deactivation Guard:** Administrators cannot deactivate their own active administrative account.
- **Session Revocation:** Whenever a user's role or active status is updated, all active sessions and bearer tokens are revoked immediately.

---

## 13. OPERATIONAL TROUBLESHOOTING GUIDE

### 13.1 Database Offline or Credentials Unprovisioned
- **Symptom:** Logs show database connectivity error for `snappy_user`.
- **System Behavior:** Built-in development fallback stores (`DEV_STORE_CONFIG`, `DEV_ORDERS_STORE`, `DEV_ADMIN_USERS_STORE`, `DEV_AUDIT_LOGS_STORE`) activate automatically, allowing all administrative functions, report exports, and tests to run smoothly without downtime.
- **Resolution:** Verify `DATABASE_URL` in `.env`, verify PostgreSQL service is running, and run `npx prisma db push` or migrations.

### 13.2 Webhook Signature Mismatch on Payment Capture
- **Symptom:** Razorpay webhook returns HTTP 400 with signature error.
- **Resolution:** Check `RAZORPAY_WEBHOOK_SECRET` environment variable against the Razorpay dashboard settings.

### 13.3 Email Delivery Delays
- **Symptom:** Emails accumulating in `PENDING` state in the Outbox.
- **Resolution:** Inspect SMTP port, host, and TLS settings. Trigger manual processing via `POST /api/admin/email/process`.

---

## 14. BACKUP AND RECOVERY OPERATIONAL INSTRUCTIONS

### 14.1 Daily Database Backup (PostgreSQL)
Run the following backup command on the production host daily at 02:00 AM IST:
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -Fc -f "/var/backups/snappy_gifts_$(date +%Y%m%d_%H%M%S).dump"
```

### 14.2 Database Restore Procedure
In the event of database corruption:
1. Put platform into maintenance mode.
2. Terminate existing connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'snappy_gifts_prod';
   ```
3. Restore from verified snapshot:
   ```bash
   pg_restore -h $DB_HOST -U $DB_USER -d snappy_gifts_prod --clean --if-exists /var/backups/target_snapshot.dump
   ```
4. Run schema validation and migration checks:
   ```bash
   npx prisma validate
   npx prisma migrate status
   ```
5. Execute the test suite to verify operational integrity:
   ```bash
   npm test
   ```
6. Lift maintenance mode and verify system health via `/admin` -> **Operations / System Health**.

---

## 15. SOP 15: SECURITY, ABUSE MONITORING & RATE LIMITING INCIDENT RESPONSE

### 15.1 Monitoring Brute Force & Rate Limit Breaches
- **Symptom:** Clients reporting HTTP 429 ("Too many attempts") on login, registration, or tracking.
- **Verification:**
  1. Inspect Upstash Redis dashboard or server logs for spike in keys matching `snappy:rl:AUTH_LOGIN:*` or `snappy:rl:GUEST_LOOKUP:*`.
  2. If legitimate users are being throttled due to corporate NAT/shared proxy IP, adjust per-operation quotas via environment or temporary allowlist.
  3. If distributed brute force is detected, verify `RATE_LIMIT_BACKEND=upstash` is active and failing closed on suspicious ranges.

### 15.2 Deactivated Account Handling & Session Purge
- When an account is suspended or deactivated via `/admin` -> **Users CRM**:
  1. The user's `isActive` flag is toggled to `false`.
  2. `invalidateAllUserSessions(userId)` is automatically executed, instantly deleting all DB and in-memory session tokens.
  3. Deactivated users attempting to log in via password receive `403 Forbidden`.
  4. Deactivated users attempting OTP verification are strictly blocked by server-side gate with `403 Forbidden`.

### 15.3 Reference Runbooks
- For in-depth vulnerability audit findings, refer to `docs/SECURITY_AUDIT_REPORT.md`.
- For disaster recovery and restore drills, refer to `docs/BACKUP_RECOVERY_RUNBOOK.md`.
- For comprehensive QA test definitions, refer to `docs/QA_TEST_STRATEGY.md`.

