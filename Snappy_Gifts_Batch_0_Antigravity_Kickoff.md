# Snappy Gifts — Antigravity Kickoff Prompt (Batch 0)

Use this prompt in Antigravity with the cloned repository `giftseccomerce-website` open as the workspace. Follow `Snappy Gifts – Master Build Plan.pdf` as the primary implementation specification.

---

## Mission

Begin **Batch 0 only: repository audit and development foundation** for the Snappy Gifts e-commerce platform. Work directly in the open local repository. Do not merely provide advice or code snippets; inspect the project and make the approved Batch 0 changes in the working tree.

The repo is believed to originate from:
`https://github.com/VinayWeb-create/giftseccomerce-website.git`

The master plan is the source of truth. Do not silently replace its decisions with assumptions. Do not start Batches 1–12 until Batch 0 has been tested and reported.

## Safety and token-efficiency limits

1. Inspect `git status`, current branch, repository tree, package manifests, README, environment examples, routing, current scripts, and existing tests before editing. Preserve all pre-existing user changes. Never reset, clean, or overwrite uncommitted work.
2. Keep this batch bounded. Do not launch parallel agents or an autonomous loop. Do not repeatedly scan files already inspected.
3. Do not deploy, push, create paid services, change production infrastructure, or run destructive database operations.
4. Never print secrets or include real `.env` values in reports. Ensure real `.env*` files are ignored (except safe examples) and `.env.example` contains names/placeholders only.
5. Do not install a new dependency or change the stack unless the repository audit establishes a need. Explain nontrivial additions before making them.
6. If a key command fails twice, stop retrying the same approach, record the evidence and blocker, and continue with independent checks where possible.
7. Report only tests that actually ran. Do not claim success based on reading source code alone.

## Step 1 — Baseline repository audit

Inspect the existing source thoroughly and produce a concise inventory:

- Framework, runtime, package manager, application entrypoints, scripts and dependencies.
- All routes/pages and key shared components.
- Current data sources: static arrays, fixture data, browser storage, mock APIs, hardcoded prices, placeholder inventory, or fake success states.
- Existing authentication, authorization, API routes, backend, database, ORM, migrations, file uploads, payments, email, PDF generation, CSV support, tests and deployment setup.
- Product, cart, checkout, account, corporate/B2B, dealer and admin functionality already present versus missing.
- Accessibility, responsive behavior, build/lint/typecheck/test status.
- Existing secrets or unsafe configuration patterns (report file paths and risk only; never print values).
- License/permission information for the source code and assets. Do not assume a public repository means its code/assets can be reused without restrictions. If the license is absent or unclear, flag the issue and continue only with safe, non-destructive audit work.

Run the existing project using the documented setup if feasible. Capture actual command results. Do not assume this is a Next.js project; verify the actual stack first and recommend the least disruptive route to the architecture in the Master Build Plan.

## Step 2 — Requirements and decisions documentation

Create or update the following documentation without duplicating existing equivalent files unnecessarily:

- `docs/PROJECT_PLAN.md` — architecture summary and the full Batch 0–12 execution sequence.
- `docs/REQUIREMENTS_CHECKLIST.md` — every applicable SOW/master-plan requirement with status values: `Not Started`, `In Progress`, `Implemented`, `Tested`, `Blocked`, `Accepted`.
- `docs/DATA_MODEL.md` — proposed entities, key relationships, constraints, money and order/payment integrity rules.
- `docs/DECISIONS.md` — confirmed decisions, recorded defaults, unresolved decisions, and who must decide each item.
- `docs/GO_LIVE_RUNBOOK.md` — planned staging/production configuration and verification checklist, with no actual secrets.

Map every relevant SOW item and all additional requirements in the Master Build Plan, including dealer portal/MRP additions, coupon deferral, personalization, GST, B2B, staff roles, admin self-service, training, email, tracking, integrations and exclusions.

Record these scope rules:

- The brand name is `Snappy Gifts`, configured rather than hardcoded wherever appropriate. Remove old Ajmer Gift Charm branding from the application only after identifying the affected locations/assets and preserving user work.
- Coupons are deferred and are not implemented in this batch. Keep a future extension point only if it naturally fits the design.
- The dealer portal and MRP/dealer pricing are marked as new scope in the master plan; record that written change-control approval must be confirmed before the feature is treated as an approved deliverable.
- No SMS, WhatsApp, chat widget, ERP integration, wishlist, product reviews, refund/returns workflow, or other excluded feature without an approved change request.
- Do not invent GSTIN, tax rates, legal details, invoice numbering rules, real product catalog entries, service credentials, or delivery promises. Test placeholders must be clearly labelled and must block live invoicing until approved data is supplied.
- The first reference website is only a provisional design base. Compare both references in a browser if available; do not claim they were inspected if they were not accessible. Preserve one coherent design system.

## Step 3 — Foundation proposal and safe setup

After the audit, implement only foundation changes justified by the actual repository and the Master Build Plan:

- Document the recommended architecture and why it fits the existing codebase.
- Prepare a local development configuration for PostgreSQL and Mailpit using Docker Compose if Docker is available and the repository can support it safely.
- Establish environment variable validation and a safe `.env.example` without real values.
- If the project architecture supports it, prepare the proposed Prisma schema draft and migration/seed foundation; do not destroy an existing schema or migrate production data.
- Prepare scripts for lint, type-check, test and build that match the actual framework and package manager.
- Prepare a `README.md` setup section so a clean clone can be run from documented steps.
- Establish the recommended directory boundaries between UI, server-side domain/business rules, service adapters, tests and docs, but do not mass-move files simply to match a diagram.
- Add a `.gitignore` check for real env files, uploaded customer files, local database data, generated artifacts and secrets.
- Prefer interfaces/adapters for future external services: payment, email, file storage and courier. Do not integrate live credentials or paid services in Batch 0.

The plan proposes Next.js App Router + TypeScript, PostgreSQL + Prisma, Auth.js, Zod, service adapters, local mock payment, Mailpit, local private storage, PDF/CSV support and Vitest/Playwright. Treat those as target options from the plan, not proof the current repo already uses them. Preserve suitable existing technology unless a reasoned, documented migration is necessary. Do not add all future dependencies in Batch 0.

## Step 4 — Non-negotiable architecture rules to document

- Store all money as integer paise; never calculate money with binary floating-point.
- Centralize server-side pricing: product/variant price, customization, gift wrap, card, offers/discounts, shipping and tax. Browser values are display-only and are revalidated on the server.
- Keep payment status separate from operational order status.
- Only mark orders paid after server-side verification and/or a verified webhook; handle duplicate and out-of-order webhooks idempotently; compare gateway amount to the server total.
- Keep all secrets server-side. Validate server inputs. Enforce permissions on every API/server action, not just by hiding UI.
- Use database transactions and guarded stock updates for order creation, stock reservation and payment attempt creation.
- Snapshot product name, price, tax/HSN and customization in order items so historical orders do not change with catalog edits.
- Avoid hard-deleting orders, payments, invoices or products; use statuses/soft deletion as appropriate.
- Record status history and audit privileged actions.
- Validate uploads by content/type, size and dimensions server-side; store private uploads outside public static folders.
- Customer tracking requires Order ID plus matching email or phone and exposes minimal information.
- Personalization effects are simulations; generated proof is a preview image plus structured text/placement metadata, not a factory engraving file.
- No production claim unless the corresponding feature has been tested.

## Step 5 — Test the Batch 0 exit criteria

Run the commands applicable to the discovered stack and report their exact outcome:

- Install/check dependencies using the repository's package manager, only if safe and needed.
- Lint.
- Type check.
- Existing unit/integration tests.
- Production build.
- Local app startup.
- Docker Compose config/startup and PostgreSQL connectivity if Docker is available.
- Migration and seed from a clean local database if schema/migrations were introduced.
- Clean-clone setup instructions are understandable and reproducible to the extent possible in the current environment.

If Docker is unavailable, do not make it a fake pass: document that database startup remains blocked and test the other pieces.

## Step 6 — Batch 0 report

At the end, provide a concise report with:

1. Existing stack and repository structure discovered.
2. Pages/features that already exist and the mock/hardcoded behavior found.
3. License/asset reuse status and any blocker.
4. Files created or modified.
5. Architecture recommendation and decisions still awaiting approval.
6. Commands actually run, with passed/failed/blocked results.
7. What I can run locally to verify the work.
8. Any blockers that require me (do not request secrets in chat).
9. Updated checklist status.
10. The exact next task for Batch 1, but do not start Batch 1 now.

## Definition of done for Batch 0

- A clear audit exists, grounded in the actual files.
- The initial plan, checklist, data-model proposal, decisions log, and go-live runbook exist or equivalent existing docs are updated.
- Local dev setup and environment guidance match the real codebase.
- No secrets were leaked; existing work remains intact.
- Appropriate baseline checks were run and honestly reported.
- Batch 0 has a clear acceptance status and the next batch is defined without silently resolving major open decisions.

Begin with `git status` and the repository audit. Make safe, bounded Batch 0 changes and then stop.
