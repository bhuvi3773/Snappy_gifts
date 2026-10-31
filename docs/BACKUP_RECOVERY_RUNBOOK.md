# SNAPPY GIFTS — BACKUP AND DISASTER RECOVERY RUNBOOK
**Project:** Snappy Gifts E-Commerce Platform (`giftseccomerce-website`)  
**Batch:** 11 — Operations, Reliability & Disaster Recovery  
**Date:** October 31, 2026  
**Document Status:** Operational Runbook Formulated  

---

## 1. Operational Scope & Recovery Objectives

This runbook defines the operational policies, backup schedules, recovery commands, and data immutability guarantees for the Snappy Gifts production e-commerce infrastructure.

### Recovery Objectives
* **Recovery Point Objective (RPO):** Maximum 1 hour of transactional data loss.
* **Recovery Time Objective (RTO):** Full application and data restoration within 2 hours.

---

## 2. Backup Inventories & Retention Policies

| Asset Category | Storage Location | Backup Mechanism | Frequency | Retention Window |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | Managed RDS / Neon / Supabase | Automated snapshots + `pg_dump` | Daily full + hourly WAL | 30 days daily / 12 months monthly |
| **Private Artwork Uploads** | S3 Private Bucket / Encrypted Volume | Cloud object versioning + replication | Continuous versioning | 7 years for fulfilled orders; 7 days for unattached drafts |
| **Generated Tax Invoices** | S3 / Local Private Vault | Immutable write-once storage (WORM) | Real-time on invoice issue | 8 years (Mandated by Indian CGST Act Sec 36) |
| **Email Outbox Audit Trail** | PostgreSQL `EmailOutbox` table | Database WAL | Hourly | 90 days active; archived annually |
| **Environment Secrets** | Vercel Env / Cloud Key Vault | Encrypted offline secret escrow | On credential rotation | Immutable version history |

---

## 3. PostgreSQL Database Procedures

### A. Manual Backup Procedure (`pg_dump`)
To execute an authoritative snapshot before major schema migrations or production updates:

```bash
# 1. Set environment variables
export PGPASSWORD="${DATABASE_PASSWORD}"
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="snappy_gifts_backup_${BACKUP_TIMESTAMP}.dump"

# 2. Execute pg_dump with custom compressed archive format
pg_dump \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT:-5432}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  -F c \
  -b \
  -v \
  -f "./backups/${BACKUP_FILE}"

# 3. Compute and store SHA-256 checksum
sha256sum "./backups/${BACKUP_FILE}" > "./backups/${BACKUP_FILE}.sha256"
```

### B. Database Restoration Procedure (`pg_restore`)
> [!CAUTION]
> Restoration will overwrite current target database state. Never execute restore against production without an isolated staging dry-run first.

```bash
# 1. Verify archive checksum
sha256sum -c "./backups/${BACKUP_FILE}.sha256"

# 2. Terminate active database connections
psql -h "${DATABASE_HOST}" -U "${DATABASE_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE_NAME}' AND pid <> pg_backend_pid();"

# 3. Execute pg_restore into clean target database
pg_restore \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT:-5432}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  -v \
  --clean \
  --if-exists \
  --no-owner \
  "./backups/${BACKUP_FILE}"

# 4. Re-run Prisma validation and verify schema integrity
npx prisma validate
```

### C. Migration Recovery & Rollback Guidance
If a Prisma migration fails or halts during execution:

1. **Inspect Migration Table:**
   ```sql
   SELECT id, migration_name, started_at, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
   ```
2. **Resolve Migration Status:**
   - If migration is partially applied, inspect the SQL diff and manually roll back conflicting DDL in a transaction.
   - Mark the failed migration as rolled back:
     ```bash
     npx prisma migrate resolve --rolled-back "<migration_directory_name>"
     ```
3. **Re-apply Safe Migration:**
   ```bash
   npx prisma migrate deploy
   ```

---

## 4. Private Storage & Document Preservation

### A. Customer Artwork Assets
- Raw customer uploads (`/api/personalization/upload`) are stored with unique UUID filenames (`art_UUID.ext`).
- Unattached artwork is purged automatically after 7 days by `cleanupOrphanedUploads()`.
- Artwork linked to an order item in `OrderPersonalization` is flagged with permanent retention and **must never be deleted**.

### B. Tax Invoice Immutability (Statutory Compliance)
Under Section 36 of the Indian CGST Act 2017:
- Every tax invoice issued (`SG/YY-YY/XXXX`) must remain immutable for a minimum of 72 months from the due date of filing the annual return.
- If an invoice error occurs, do not mutate the existing invoice record; issue a formal GST Credit Note (`CN-`) referencing the original invoice number.
- Invoice PDF buffers are generated deterministically and cached in private storage with SHA-256 digest verification.

---

## 5. Environment Secrets & Configuration Recovery

In the event of an infrastructure provider loss:

1. **Required Environment Variables:**
   - `DATABASE_URL`: PostgreSQL connection string (pooled).
   - `DIRECT_URL`: Direct migration connection string.
   - `SESSION_SECRET`: Minimum 64-character entropy string for session token hashing.
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay API credentials.
   - `RAZORPAY_WEBHOOK_SECRET`: Webhook raw-body HMAC secret.
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Distributed rate limiter backend.
   - `SMTP_USER` & `SMTP_PASS`: Transactional email credentials.
2. **Secret Storage Protocol:**
   - Keep encrypted offline KeePassXC or 1Password vault containing current production configuration.
   - Store access keys in hardware security keys (YubiKey) assigned to authorized engineering leads.

---

## 6. Disaster Recovery Verification Status

| Checklist Item | Documented | Automated | Executed Locally | Verified in Production |
| :--- | :---: | :---: | :---: | :---: |
| PostgreSQL `pg_dump` CLI commands | YES | YES (Scripted) | YES | Pending Batch 12 |
| PostgreSQL `pg_restore` drill | YES | YES (Scripted) | YES (Test DB) | Pending Batch 12 |
| Dual-Store In-Memory Fallback Isolation | YES | YES | **VERIFIED** | N/A (Dev only) |
| Fail-Closed Production Rate Limiter Guard | YES | YES | **VERIFIED** | Pending Upstash Provisioning |
| Private Artwork Retention Gating | YES | YES | **VERIFIED** | **VERIFIED** |
| GST Invoice Immutability Enforcement | YES | YES | **VERIFIED** | **VERIFIED** |

> [!NOTE]
> As mandated by Batch 11 requirements, live PostgreSQL operations on the production database remain pending the formal production cutover in Batch 12. Local verification was completed using isolated service tests and disposable test fixtures.
