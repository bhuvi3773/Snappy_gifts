# Repository Audit & Technical Baseline: Snappy Gifts

**Date of Audit:** October 29, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Repository:** `VinayWeb-create/giftseccomerce-website`  
**Current Branch:** `snappy-gifts/batch-0-audit-foundation-20261029`  
**Working Directory:** `c:\Web_Templates\Snappy_Gifts\giftseccomerce-website`  
**Baseline Commit:** `4139101 chore: remove author credit text from footer and readme`

---

## 1. Executive Summary

This repository was audited as the foundation for **Snappy Gifts**, a premier B2C and B2B corporate gifting e-commerce platform.

The existing codebase is a **client-side React 19 Single-Page Application (SPA)** built with **Vite 8**, **TypeScript**, and **Tailwind CSS v4**. It features high-quality UI/UX components (personalized studio preview, drawer cart, checkout modal, corporate portal, ops dashboard, printable invoice modal). 

However, **there is currently no backend, no server-side API, no database, no authentication system, and no server-side pricing or order validation**. All state (products, orders, quotations, cart, tickets) resides entirely in browser memory synced to `localStorage`, with hardcoded mock data, floating-point rupee prices, and client-simulated checkout/dispatch workflows.

The **Master Build Plan** and **SOW** require a **Next.js App Router (SSR / dynamic metadata)** architecture with **PostgreSQL + Prisma ORM**, **Auth.js (RBAC)**, **Zod validation**, **server-side integer paise pricing**, **real Razorpay payment gateway integration**, and **transactional email/PDF generation**.

Per Batch 0 requirements, this audit documents the exact delta, preserves all pre-existing user work, establishes baseline tooling and configuration, and outlines the approved staged migration path.

---

## 2. Technical Stack Inventory

| Component | Discovered Repository State | SOW / Master Build Plan Target | Delta & Action |
| :--- | :--- | :--- | :--- |
| **Framework** | React 19.0.1 + Vite 8.3.0 (SPA) | Next.js 15+ App Router (SSR) | Architecture Approval Gate: Migrate deliberately to Next.js App Router to meet SSR & SEO metadata requirements while porting existing UI components. |
| **Language** | TypeScript 7.0.2 (`tsconfig.json` target ES2022) | TypeScript 5+ strict mode | Compatible. Retain strict type safety. |
| **Styling** | Tailwind CSS v4.3.3 (`@tailwindcss/vite`) | Tailwind CSS v3/v4 | Compatible. Keep existing modern luxury palette and typography. |
| **Icons & Motion** | `lucide-react` (0.546.0), `motion` (12.23.24) | Lucide React, Framer Motion | Compatible. Already installed and functioning. |
| **Package Manager** | `package-lock.json` + `bun.lock` in repo; npm `11.6.2` on host | Standard npm (or pnpm/bun) | Standardize on **npm**. (Host environment has Node `v24.13.0` & npm `11.6.2`; `bun` is not installed on system). |
| **Runtime** | Node.js `v24.13.0` (Windows x64) | Node.js 18+ / 20+ LTS | Fully supported. |
| **Routing** | In-memory modal/tab routing via `useState` in `App.tsx` | Next.js App Router (`/`, `/catalog`, `/cart`, `/checkout`, `/b2b`, `/admin`) | Requires route restructuring during Next.js migration. |
| **Authentication** | None. Unrestricted client-side role dropdown in `Header.tsx` | Auth.js (NextAuth) with session cookies & server RBAC | Must be implemented in Batch 1. |
| **Database & ORM** | None (`localStorage` only) | PostgreSQL 16+ with Prisma ORM | Prepare Prisma schema draft and Docker Compose in Batch 0; implement in Batch 1-2. |
| **Pricing Engine** | Client-side floating-point rupees (`basePrice: 1299`) | Server-side integer paise (`basePricePaise: 129900`) | Non-negotiable architectural rule. Re-architect in Batch 4. |
| **Payments** | Simulated client-side `setTimeout` + `canvas-confetti` | Server-validated Razorpay orders, signatures, and webhooks | Implement provider adapter and webhook endpoint in Batch 5. |
| **Email Service** | None (client-side toasts only) | Nodemailer / Resend via Mailpit (local) | Configure local Mailpit in Docker Compose in Batch 0; implement transactional jobs in Batch 8. |
| **PDF Generation** | `window.print()` in browser | Server-side PDF generation (`@react-pdf/renderer` or PDFKit) | Implement in Batch 8. |
| **File Storage** | In-memory browser data URLs | Local protected disk / S3-compatible bucket | Implement adapter interface in Batch 0; implement secure uploads in Batch 7. |
| **Testing** | None (0 test files, no test script in `package.json`) | Vitest (unit/integration) + Playwright (E2E) | Configure test runner scripts in Batch 0. |

---

## 3. Application Routes, Screens & Shared Components

### 3.1 Entry Points
- `index.html`: Pre-connects Google Fonts (`Cormorant Garamond`, `Great Vibes`, `Playfair Display`, `Plus Jakarta Sans`, `Dancing Script`).
- `src/main.tsx`: Mounts React root onto `#root`.
- `src/App.tsx`: Central coordinator managing modes (`'b2c' | 'b2b' | 'admin'`) and active modals (`'none' | 'cart' | 'checkout' | 'product_detail' | 'personalize' | 'order_track' | 'invoice_view'`).

### 3.2 UI Components Inventory
1. **`Header.tsx` (19.9 KB)**:
   - Sticky top bar with announcement ticker, delivery PIN code indicator, mode toggles (`B2C Store`, `B2B Portal`, `Ops`), role simulation menu (`Individual Buyer`, `B2B Procurement Officer`, `Store Admin`, `Warehouse Staff`), logo, pill search bar, and cart count.
   - *Issues identified:* Logo text is hardcoded as `AJMER GIFT CHARM .COM`. Persona switching has no authentication check.
2. **`HeroBanner.tsx` (17.7 KB)**:
   - Luxury hero layout with carousel slides, artisan badge, CTA buttons ("Explore Curated Gifts", "Corporate Bulk RFQ"), and quick category cards.
3. **`ProductCard.tsx` (8.6 KB)**:
   - Displays image, category badge, rating, price, MRP with discount badge, "Quick View" and "Personalize / Add to Bag" CTAs.
4. **`ProductDetailModal.tsx` (19.0 KB)**:
   - Detailed modal showing multi-image thumbnails, SKU, HSN, tax rate, stock count, tiered bulk pricing table, customization specification fields, and delivery estimation by PIN.
5. **`PersonalizationStudio.tsx` (20.5 KB)**:
   - Interactive engraving / hot-foil canvas preview. Lets user input text, select font (`Great Vibes`, `Cormorant Garamond`, `Plus Jakarta Sans`), pick finish (`Laser Etched Charcoal`, `24K Gold Foil Embossed`, `Silver Frost Etching`), and upload logo/artwork file (previewed via FileReader).
   - *Issues identified:* Proof image and coordinates are kept only in client memory. No server upload validation.
6. **`CartDrawer.tsx` (13.4 KB)**:
   - Slide-out cart displaying line items, quantity modifiers, customization notes, coupon code input (`WELCOME100`, `FESTIVE15`, `CORP20`), free shipping threshold bar (₹999), tax calculation, and checkout CTA.
7. **`CheckoutModal.tsx` (28.3 KB)**:
   - Multi-step modal: (1) Address & PIN validation, (2) Payment selection (`UPI`, `Razorpay`, `CreditCard`, `CorporateCredit`, `COD`), (3) Simulated 1.5s delay + confetti explosion + simulated order ID (`AJM-2026-XXXX`).
   - *Issues identified:* Payment is 100% simulated in the browser. Floating-point arithmetic used for tax.
8. **`OrderTrackingModal.tsx` (7.4 KB)**:
   - Displays order timeline (Order Placed, Artwork Approval, In Customization, Quality Check, Dispatched, Delivered) and simulated AWB/courier info.
   - *Issues identified:* Any user can look up orders without authentication or phone/email matching.
9. **`TaxInvoiceModal.tsx` (13.5 KB)**:
   - Printable HTML GST Tax Invoice and Corporate Quotation display with print-specific CSS.
   - *Issues identified:* Seller details hardcoded ("AJMER GIFT CHARM LLP", GSTIN "08AAACA9921M1Z3", Ajmer address). No server-generated PDF.
10. **`b2b/CorporatePortal.tsx` (42.6 KB)**:
    - Corporate Bulk Gifting dashboard: tier discounts, RFQ submission modal, recipient spreadsheet CSV upload parser, multi-address dispatch builder, organization profile management.
    - *Issues identified:* CSV parsed with simple string split; no server-side schema validation or transactional persistence.
11. **`admin/AdminDashboard.tsx` (30.3 KB)**:
    - Ops management portal: metrics cards, order fulfillment status updater, inventory stock adjustor, product catalog editor, RFQ approval/rejection, audit log viewer, customer support tickets.
    - *Issues identified:* Completely open without authentication or authorization.
12. **`WhatsAppFloatingButton.tsx` (8.5 KB)**:
    - Floating action button opening a mock WhatsApp dialog.
    - *Issues identified:* Current SOW explicitly excludes third-party WhatsApp / chat widget integration. Must be removed or converted into an approved contact mechanism.
13. **`Footer.tsx` (8.9 KB)**:
    - Links to policies, artisan notes, customer care contact, copyright.

---

## 4. Data Sources, State & Storage Audit

### 4.1 Static Fixtures (`src/data/initialData.ts`)
- `INITIAL_PRODUCTS`: 8 detailed products covering drinkware, desk mats, plush toys, brass lanterns, candles, hampers, luxury handbags, and stationery.
- `INITIAL_ORDERS`: 3 sample orders with mixed B2C and B2B order types.
- `INITIAL_QUOTATIONS`: 2 corporate RFQ quotations with volume tiers.
- `INITIAL_TICKETS`: 3 customer support tickets.
- `SERVICEABLE_PINCODES`: Dictionary of ~15 sample Indian PIN codes (e.g. `305001` Ajmer, `110001` Delhi, `400001` Mumbai).

### 4.2 LocalStorage Keys
The application reads and writes to:
- `ajmer_products_v1`
- `ajmer_orders_v1`
- `ajmer_rfqs_v1`
- `ajmer_cart_v1`
- `ajmer_wishlist_v1`

*Critical Observation:* All mutations in the admin panel or storefront modify `localStorage`. Clearing browser cookies or opening an incognito window resets the entire store to mock defaults.

---

## 5. Security & Configuration Risk Audit

1. **Authentication Absence:** Anyone accessing the site has instant root access to the admin dashboard and can edit products, delete orders, or approve RFQs simply by clicking a role switch.
2. **Pricing Integrity Risk:** Subtotal, discount, tax, and grand total calculations happen inside the React component tree using JavaScript IEEE 754 floating-point numbers. In a live system, a malicious client could modify payload numbers before submission.
3. **Hardcoded Identity & PII:**
   - Sample names: "Aarav Malhotra", "Dr. Meenakshi Rathore", "Vikramaditya Roy", "Ananya Deshmukh".
   - Hardcoded phone numbers and emails (`billing@ajmergiftcharm.com`, `+91 98290 84721`).
   - Hardcoded GSTIN: `08AAACA9921M1Z3` (seller) and `27AABCN8891P1ZX` (sample client).
4. **Environment Variables:**
   - Current `.env.example` has only `GEMINI_API_KEY` and `APP_URL`.
   - Real `.env*` files are properly listed in `.gitignore`.
   - No live credentials or production secrets were discovered in the repository history or files.
5. **Private Upload Exposure:** Customer photo uploads in the personalization studio are read as base64 Data URLs and stored directly in the React state object. Large images will quickly exhaust `localStorage` limits (5MB-10MB quota) or degrade browser performance.

---

## 6. License & Asset Reuse Status

- **License File:** No `LICENSE` or `COPYING` file exists in the repository root.
- **Source Origin:** Cloned from `https://github.com/VinayWeb-create/giftseccomerce-website.git`.
- **Assets:** Images in `public/assets/` (`luxury_gift_hero_bg.jpg`, category thumbnails) and external Unsplash URLs are used as placeholders.
- **Action Flag:** Per Master Build Plan rules, public availability of a repository does not confer unrestricted commercial reuse rights. Explicit client confirmation of asset and code rights is documented as an open decision in `docs/DECISIONS.md`.

---

## 7. Baseline Command Verification

The following commands were run in the working tree (`c:\Web_Templates\Snappy_Gifts\giftseccomerce-website`):

| Command | Status | Result / Output Summary |
| :--- | :--- | :--- |
| `git status --short` | **Passed** | Clean tree on `snappy-gifts/batch-0-audit-foundation-20261029`. |
| `node --version` | **Passed** | `v24.13.0` |
| `npm --version` | **Passed** | `11.6.2` |
| `bun --version` | **Failed (Not Installed)** | Command not recognized on host. `npm` selected as standard. |
| `docker --version` | **Failed (Not Installed)** | Docker CLI is not installed on host. Local DB will require external Postgres or Docker Desktop installation. |
| `npm ci` | **Passed** | 182 packages installed cleanly in 58s. 0 vulnerabilities. |
| `npm run lint` (`tsc --noEmit`) | **Passed** | 0 TypeScript type errors. |
| `npm run build` (`vite build`) | **Passed** | Production client bundle built in 874ms (`dist/index.html` 1.68 kB, JS 447 kB, CSS 89 kB). |
| `npm test` | **Not Configured** | No test runner or script existed in baseline `package.json`. Added in Batch 0. |

---

## 8. Summary of Batch 0 Interventions

1. Generated comprehensive documentation suite (`REPOSITORY_AUDIT.md`, `PROJECT_PLAN.md`, `REQUIREMENTS_CHECKLIST.md`, `DATA_MODEL.md`, `DECISIONS.md`, `GO_LIVE_RUNBOOK.md`).
2. Configured local development infrastructure (`docker-compose.yml` for PostgreSQL 16 + Mailpit).
3. Prepared `prisma/schema.prisma` draft establishing relational data model in integer paise.
4. Added environment variable schema validation (`src/config/env.ts`) and expanded `.env.example`.
5. Created provider adapter interfaces (`src/services/adapters/`) for payments, email, file storage, and logistics.
6. Updated `package.json` with standard `test`, `test:watch`, `typecheck`, and `lint` scripts.
7. Updated `README.md` with honest setup steps and clean-clone instructions.
