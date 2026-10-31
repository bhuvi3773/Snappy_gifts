# Snappy Gifts — Antigravity Working Workflow

## The short answer

**Yes: create a separate Git branch for each batch, commit in small meaningful steps, push the branch, test it, and merge only after you approve the batch.** The complete project is planned up front, but implementation should be incremental and integrated. Do not ask Antigravity to build the entire e-commerce platform in one giant pass.

The Master Build Plan explicitly says one batch equals one branch, merged only after acceptance; every batch should finish with real checks and a demo you can try. This guide turns that rule into a daily workflow.

## 1. Important repository facts already identified

The GitHub source `VinayWeb-create/giftseccomerce-website` currently uses:

- React 19 + TypeScript + Vite (it is not currently a Next.js app).
- Tailwind CSS v4, Lucide icons, Motion, and `canvas-confetti`.
- Main UI modules for header, product cards/details, personalization, cart, checkout, tracking, tax-invoice display, corporate portal, admin dashboard, footer and WhatsApp button.
- Frontend state and sample data in `src/context/AppContext.tsx` and `src/data/initialData.ts`, with `localStorage` used for products/orders/cart/wishlist/quotations.
- A checkout handler that simulates completion in the browser; no real Razorpay order/signature/webhook implementation was found in the files reviewed.
- No database schema/migrations or production server/API implementation was visible in the reviewed tree.
- Both `package-lock.json` and `bun.lock` exist; choose and document one package manager before changing setup.
- `npm run lint` currently runs `tsc --noEmit` (a TypeScript check, not a lint tool). No test script was visible in `package.json`.
- Branding, demo customer data, fictional testimonials/claims, sample company details, and Ajmer wording need review before launch.

The SOW requires Next.js SSR/dynamic metadata. The Master Build Plan proposes Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, Zod, provider adapters, Vitest and Playwright. **Treat migration from Vite to Next.js as an approval gate; do not silently make a large architecture change.** The recommended direction is to migrate deliberately while preserving and porting suitable UI, if you approve it.

No `LICENSE` file was visible in the repository tree inspected. Confirm you own or have permission to reuse/rebrand the code and assets before public deployment. Public visibility alone is not a reuse license.

## 2. Branch and commit workflow

### Branch rules

- `main` is the stable branch. Do not implement features directly on `main`.
- One build batch = one working branch.
- Make multiple small commits on that branch when useful; do not force every batch into one huge commit.
- Push the branch and open a Pull Request (PR) to `main`.
- Only merge when the acceptance criteria are met, required tests have actually passed, the diff is reviewed, and you approve it.
- Start the next batch from the updated `main` after the previous batch is merged.
- Never commit `.env`, real API keys, payment secrets, database passwords, real customer uploads or other secrets.

### First: inspect the local clone without changing it

Run these in Antigravity's terminal from the repository root:

```powershell
git status --short
git branch --show-current
git remote -v
git log -1 --oneline
```

If `git status --short` shows changes, do not discard them. Understand whether they are yours and either commit or safely preserve them before switching branches.

### Create a branch for Batch 0

A remote branch named `snappy-gifts/batch-0-audit-foundation-20261029` was created earlier as an empty branch pointing at `main`; no code commits were added by that action. You can use it, or create your own branch. To use the existing remote branch in your clone:

```powershell
git fetch origin
git switch --track -c snappy-gifts/batch-0-audit-foundation-20261029 origin/snappy-gifts/batch-0-audit-foundation-20261029
```

If that branch does not exist remotely or the command does not work, use a fresh branch based on current `main`:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c batch/00-discovery-foundation
```

Do not run the fallback if you have uncommitted work that would be overwritten. Ask Antigravity to inspect `git status` first.

### During and after the batch

```powershell
# Review changed files and whitespace errors
git status --short
git diff --stat
git diff --check
git diff

# Stage only files you inspected; never use git add . blindly on a repo containing secrets
git add docs/README.md docs/PROJECT_PLAN.md
git commit -m "docs: add Snappy Gifts Batch 0 project foundation"

# Push branch
git push -u origin HEAD
```

Replace the sample `git add` paths with the actual intended files. Prefer several understandable commits, for example `docs: record repository audit`, `build: add local database services`, and `test: configure baseline checks`.

Then create a PR on GitHub from your batch branch into `main`. Review the changed files and checks. Merge only after the batch passes acceptance. After merging:

```powershell
git switch main
git pull --ff-only origin main
git switch -c batch/01-auth-and-permissions
```

Use a new branch name for each next batch. Do not create all future branches from an old `main` snapshot.

## 3. Baseline check before changing code

On Batch 0, ask Antigravity to inspect the package files and explain the chosen package manager. Since `package-lock.json` exists, npm is a reasonable default if that is what you use, but do not mix package managers. If npm is selected, run:

```powershell
node --version
npm --version
npm ci
npm run lint
npm run build
```

Run these commands one at a time and capture the output. `npm ci` can fail if the lockfile and package manifest are inconsistent. `npm run lint` is currently a TypeScript no-emit check. There may not be a test script yet. Record failures as the baseline; don't pretend they passed and don't start unrelated cleanup without agreeing on it.

If install fails due to network, Node version or dependency resolution, show the complete relevant error to Antigravity and fix the root cause before moving forward. Do not add random dependencies just to silence errors.

## 4. Paste this prompt into Antigravity now — Batch 0

> You are working in the existing local clone of `VinayWeb-create/giftseccomerce-website`. Follow `Snappy Gifts – Master Build Plan.pdf`, `Snappy_Gifts_SOW.pdf`, and the repository's `docs/` files as the source of truth. The full platform has been planned; **execute Batch 0 only**. Do not build Batch 1 or later yet.
>
> **Token/work limits:** inspect relevant files only; summarize findings in project docs rather than repeating a long report; use one agent; no unbounded loops; stop after two failed attempts at the same approach and report the blocker. Do not re-scan files you already inspected unless the content changed.
>
> **Safety:** before editing, run `git status --short`, confirm the current branch is not `main`, and preserve all pre-existing changes. Never discard user work. Never commit `.env` or secrets. Do not deploy, connect live payment credentials, run destructive database operations, or incur a paid service without my approval.
>
> **Batch 0 work:**
> 1. Audit the current repository structure, routes/screens, shared components, hardcoded demo data, `localStorage` persistence, simulated actions and existing scripts. Read `package.json`, lockfiles, `.env.example`, `tsconfig.json`, and relevant source files. Do not read `node_modules` recursively.
> 2. Record baseline commands and results: install, type-check, build, and existing tests if any. If a command cannot be run, state that precisely. Do not fabricate test results.
> 3. Document the difference between the current React/Vite frontend and the SOW's Next.js SSR/dynamic metadata requirement. Recommend a staged Vite-to-Next.js migration that preserves appropriate UI, but do not perform the migration until I approve the architecture decision.
> 4. Confirm the code and asset reuse/licensing status. No root `LICENSE` file was visible in the earlier repository review; do not assume public visibility grants reuse permission.
> 5. Establish/refresh `docs/REPOSITORY_AUDIT.md`, `docs/PROJECT_PLAN.md`, `docs/DECISIONS.md`, `docs/DATA_MODEL.md`, `docs/REQUIREMENTS_CHECKLIST.md`, and `docs/GO_LIVE_RUNBOOK.md`. Reconcile them with the actual code and the source PDFs. Do not claim proposed schema is already implemented.
> 6. Record the architecture recommendation: Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js, Zod, server-side domain modules, provider adapters for payment/email/storage/courier, Vitest and Playwright—subject to the architecture gate. Avoid microservices and unnecessary dependencies.
> 7. Track the new dealer portal/MRP/dealer pricing as added scope requiring written change-control approval. Coupons are deferred in this build. No WhatsApp/SMS/chat integration under the current SOW. Do not present fictional sample reviews, counts, delivery claims or company details as real business facts.
> 8. Choose one package manager and document why. Make only safe setup/documentation changes that do not force an unapproved architecture migration. If you add Docker Compose/Postgres/Mailpit, keep it local-development-only and document requirements. Do not connect external paid services at Batch 0.
> 9. Update the requirement checklist with honest statuses: Not Started, In Progress, Implemented, Tested, Blocked or Accepted. Existing UI prototypes are not complete backend features.
> 10. Run relevant checks again after edits. Use `git diff --check`, inspect the complete diff, and list every modified/added file.
>
> **Required output:** a concise report with (a) what you inspected, (b) baseline build/type-check/test results, (c) files changed, (d) unresolved decisions grouped into blockers/important configuration/deferrable, (e) actual checks run, (f) how I can verify the work, and (g) whether Batch 0 acceptance criteria are met. Stop after Batch 0; do not start the next batch.

## 5. Questions to resolve before the batches that need them

Do not ask all of these repeatedly. Keep them in `docs/DECISIONS.md` and ask only when a decision becomes a blocker.

**Required before foundation is locked:**
1. Do you own or have explicit permission to reuse/rebrand this repository's code and assets?
2. Do you approve migrating to Next.js to meet the SOW's SSR/dynamic metadata requirement while preserving/porting appropriate UI? Recommendation: yes, unless you prefer to formally change the SOW architecture.

**Before checkout (Batch 4):** approve tax-inclusive vs tax-exclusive retail display (Master Plan default: tax-inclusive); shipping/free-shipping rules, serviceability data source and stock-reservation hold time (default: 15 minutes).

**Before corporate flow (Batch 9A):** approve online payment after quote approval or another explicitly defined payment/credit-term policy (Master Plan default: online after approval).

**Before dealer portal (Batch 9B):** approve the added dealer/MRP scope in writing; otherwise do not build it as committed scope. Master Plan default suggestions are dealer price per variant, dealer-only daily offers and prepaid online dealer checkout.

**Before live invoicing/payment/email:** provide real approved seller/GST/HSN/invoice information, Razorpay merchant activation/credentials, email provider and DNS access, database/hosting/storage setup and final product catalog. Put credentials only in local ignored `.env` or hosting secret settings—never in chat or Git.

## 6. The build order after Batch 0

Follow the Master Build Plan sequence, adjusting only when the dependency graph or actual code justifies it:

- **Batch 1 — Auth and roles:** password/email OTP, centralized permission helper, protected admin shell; server-side checks for every protected action.
- **Batch 2 — Catalog/admin:** database-backed categories, occasions, products, variants, images, stock, CRUD and audit log.
- **Batch 3 — Storefront:** home, occasion collections, catalogue, search/filter/sort, product details, responsive and SEO behavior.
- **Batch 4 — Pricing/cart/checkout:** one server pricing module; integer paise; address/pincode validation; transactional order creation and stock reservation; duplicate-submit protection.
- **Batch 5 — Payments:** mock adapter first, then Razorpay integration; payment attempts/events; raw-body webhook signature verification; idempotency, retries and pending-payment reconciliation.
- **Batch 6 — Orders/tracking:** order state machine/history, dispatch assignment, manual AWB/carrier, privacy-safe tracking and customer order history.
- **Batch 7 — Personalization:** validated upload, text/font/effect preview, crop/placement, server-computed surcharge and saved proof+metadata attached to order item.
- **Batch 8 — Invoice/email:** database tax rules, invoice sequence, PDF invoice/packing slip, transactional emails through jobs with retries and deduplication.
- **Batch 9A — Corporate B2B:** registration/profile, RFQ, volume tiers, quotes/approval, CSV validation with row-level errors, one order with multiple shipment records.
- **Batch 9B — Dealer portal:** only after scope approval.
- **Batch 10 — Admin completion:** settings, customers, email status, real-data reports, audit viewer, import/export and training content.
- **Batch 11 — Hardening/QA:** security, permissions, rate limits, accessibility, performance, full suite, browser/mobile tests and tested backup restore.
- **Batch 12 — Integrations/go-live:** hosted services, Razorpay test then live after merchant approval, email DNS, storage, domain/HTTPS, staging/UAT, production smoke test, rollback and handover.

## 7. General prompt for every later batch

Paste this before the specific batch task and append only the relevant batch's scope:

> Execute only Batch [N] from `docs/PROJECT_PLAN.md`. Read the relevant requirements and decisions first. Confirm the branch is for this batch and the working tree is safe. State scope, dependencies, files/tables expected to change, and acceptance criteria briefly; then implement the agreed slice end-to-end. Keep business logic in server/domain modules, use server validation and authorization, and do not trust browser prices or payment status. Add/update tests for changed behavior. Run the targeted tests, type-check and build as applicable; report only checks actually run. Inspect `git diff --check` and the full diff. Update `docs/REQUIREMENTS_CHECKLIST.md` and `docs/DECISIONS.md`. Do not start another batch, deploy, use live credentials, or merge to main. Report passed/failed/incomplete/blocked and steps for me to verify. Stop when this batch's scope is done or an approval blocker is reached.

## 8. Batch acceptance gate

Do not merge a batch until all applicable items are true:

- [ ] The batch matches the approved scope and the Master Build Plan.
- [ ] Changed files and migration/schema changes have been reviewed.
- [ ] `git diff --check` passes.
- [ ] Type-check/build and relevant tests were actually run; results are recorded.
- [ ] Important failure paths and authorization boundaries were tested.
- [ ] No secret keys, real customer data or accidental generated files are committed.
- [ ] Documentation and requirement statuses are updated honestly.
- [ ] You can run/try the feature using clear verification steps.
- [ ] Blockers and untested behavior are explicitly listed.
- [ ] You approve the batch and then merge its PR.

## 9. Final production gate

A deployed frontend is not the same as a production-ready platform. Before accepting go-live, ensure real end-to-end paths work: retail guest/registered order, personalization persistence through fulfillment, verified Razorpay payment/webhook (sandbox first), invoice generation and email attachment, corporate RFQ → approved quote → validated recipient CSV → multiple shipment tracking, role negative tests, tracking privacy/rate limit, responsive cross-browser checks, monitoring, HTTPS, backups and a tested restore. Live tax invoices require approved legal/tax data. Automated courier booking requires actual courier API access. Record UAT acceptance and deliver the admin guide/training materials.

## 10. Daily operating rhythm

1. Start from the current `main`; create/switch to the current batch branch.
2. Give Antigravity the general prompt plus the exact batch scope.
3. Let it implement no more than three small stories in the batch at once.
4. Inspect the diff and test result before authorizing further work.
5. Commit a logical, reviewed checkpoint; push the branch.
6. Open/update the PR; review/resolve findings.
7. Verify acceptance, then merge.
8. Update `docs/REQUIREMENTS_CHECKLIST.md` and start the next batch from updated `main`.

**Do not ask Antigravity to “finish the whole website” in one prompt. Ask it to finish one accepted batch within the complete approved plan.**
