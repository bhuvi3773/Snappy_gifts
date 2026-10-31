# Snappy Gifts — Relational Data Model Specification

**Target Database:** PostgreSQL 16+  
**ORM:** Prisma ORM  
**Currency Standard:** All currency amounts stored strictly as **Integer Paise** (`1 INR = 100 paise`). Zero floating-point arithmetic.

---

## 1. Entity Relationship Diagram (Conceptual)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │1     *│     Address     │       │     Setting     │
│  (Auth, Roles)  ├───────┤ (Saved Address) │       │ (Global Config) │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │1
         │
         │*                       ┌─────────────────┐
┌────────┴────────┐       ┌───────┤    Category     │
│  Organization   │1     *│1     *└─────────────────┘
│  (B2B Profile)  ├───────┤Product│
└────────┬────────┘       └───┬───┘
         │1                   │1
         │                    │*
         │*               ┌───┴─────────────┐       ┌─────────────────┐
┌────────┴────────┐       │ ProductVariant  │       │  PincodeHub     │
│   Quotation     │       │(SKU, Attributes)│       │ (Serviceability)│
│ (Corporate RFQ) │       └───┬─────────────┘       └─────────────────┘
└─────────────────┘           │1
                              │*
┌─────────────────┐       ┌───┴─────────────┐       ┌─────────────────┐
│     Payment     │*     1│    OrderItem    │*     1│      Order      │
│(Gateway Attempts├───────┤ (Item Snapshot) ├───────┤ (Master Order)  │
└─────────────────┘       └───┬─────────────┘       └───┬─────────────┘
                              │1                        │1
                              │*                        │*
                          ┌───┴─────────────┐       ┌───┴─────────────┐
                          │   Personalize   │       │    Shipment     │
                          │(Proof & Details)│       │(Split Multi-AWB)│
                          └─────────────────┘       └─────────────────┘
```

---

## 2. Core Entities & Schema Details

### 2.1 User & Organization (RBAC)

```prisma
enum Role {
  CUSTOMER
  B2B_CLIENT
  STAFF
  ADMIN
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  phone         String?
  name          String
  passwordHash  String?
  role          Role           @default(CUSTOMER)
  isActive      Boolean        @default(true)
  organizationId String?
  organization  Organization?  @relation(fields: [organizationId], references: [id])
  addresses     Address[]
  orders        Order[]
  quotations    Quotation[]
  auditLogs     AuditLog[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Organization {
  id              String      @id @default(uuid())
  companyName     String
  gstin           String      @unique
  businessEmail   String
  contactPerson   String
  phone           String
  industry        String?
  annualBudget    String?
  creditLimitPaise BigInt     @default(0)
  creditUsedPaise  BigInt     @default(0)
  isApproved      Boolean     @default(false)
  users           User[]
  quotations      Quotation[]
  orders          Order[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

### 2.2 Address Book

```prisma
model Address {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  name        String
  company     String?
  street      String
  city        String
  state       String
  stateCode   String   // e.g. "08" for Rajasthan, "27" for Maharashtra
  pincode     String   // 6-digit Indian PIN code
  phone       String
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.3 Product Catalog, Variants & Bulk Tiers

```prisma
model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  description String?
  imageUrl    String?
  isActive    Boolean   @default(true)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id                   String           @id @default(uuid())
  name                 String
  slug                 String           @unique
  tagline              String?
  description          String
  categoryId           String
  category             Category         @relation(fields: [categoryId], references: [id])
  occasions            String[]         // e.g. ["Birthday", "Corporate", "Diwali"]
  recipients           String[]         // e.g. ["For Him", "Colleague"]
  hsnCode              String           // e.g. "69120010"
  taxRatePercent       Int              @default(18) // 5, 12, 18, 28
  basePricePaise       Int              // Integer paise (e.g., 129900 = ₹1,299.00)
  mrpPaise             Int              // Retail display MRP in paise
  isCustomizable       Boolean          @default(false)
  customizationType    String?          // "engraving" | "photo" | "logo" | "combo"
  customizationFeePaise Int             @default(0)
  isB2BRecommended     Boolean          @default(false)
  minOrderQty          Int              @default(1)
  images               String[]
  galleryImages        ProductImage[]
  productOccasions     ProductOccasion[]
  isActive             Boolean          @default(true)
  isArchived           Boolean          @default(false)
  variants             ProductVariant[]
  bulkTiers            BulkTier[]
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt
}

model Occasion {
  id          String            @id @default(uuid())
  name        String            @unique
  slug        String            @unique
  description String?
  imageUrl    String?
  isActive    Boolean           @default(true)
  products    ProductOccasion[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model ProductOccasion {
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  occasionId String
  occasion   Occasion @relation(fields: [occasionId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@id([productId, occasionId])
  @@index([occasionId])
  @@index([productId])
}

model ProductImage {
  id           String   @id @default(uuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url          String
  altText      String?
  displayOrder Int      @default(0)
  isPrimary    Boolean  @default(false)
  storageKey   String?
  createdAt    DateTime @default(now())

  @@index([productId])
  @@index([productId, displayOrder])
}

model ProductVariant {
  id                   String                @id @default(uuid())
  productId            String
  product              Product               @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku                  String                @unique
  name                 String                // e.g. "Rose Gold / Standard"
  attributes           Json                  // e.g. { "color": "Rose Gold", "finish": "Matte" }
  pricePaise           Int                   // Integer paise override
  stockQuantity        Int                   @default(0)
  isActive             Boolean               @default(true)
  isArchived           Boolean               @default(false)
  orderItems           OrderItem[]
  inventoryAdjustments InventoryAdjustment[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@index([sku])
  @@index([productId])
}

enum InventoryAdjustmentReason {
  RESTOCK
  MANUAL_CORRECTION
  DAMAGE_WRITE_OFF
  RETURN_RESTOCK
  ORDER_RESERVATION
  RESERVATION_EXPIRED
  ORDER_FULFILLMENT
  AUDIT_RECONCILIATION
}

model InventoryAdjustment {
  id            String                    @id @default(uuid())
  variantId     String
  variant       ProductVariant            @relation(fields: [variantId], references: [id], onDelete: Restrict)
  sku           String                    // Immutable SKU snapshot at time of adjustment
  productName   String?                   // Product name snapshot
  previousStock Int
  adjustedQty   Int                       // Signed delta: +50, -10
  newStock      Int                       // Balance after adjustment
  reason        InventoryAdjustmentReason @default(MANUAL_CORRECTION)
  referenceId   String?                   // e.g. PO number, Batch ID, Order ID
  userId        String?
  user          User?                     @relation(fields: [userId], references: [id])
  notes         String?
  createdAt     DateTime                  @default(now())

  @@index([variantId])
  @@index([createdAt])
  @@index([reason])
}

model BulkTier {
  id                 String   @id @default(uuid())
  productId          String
  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  minQty             Int
  maxQty             Int?
  discountPercentage Int
  pricePerUnitPaise  Int      // Integer paise
}
```

### 2.4 Orders, Snapshots & Payments

```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  IN_CUSTOMIZATION
  QUALITY_CHECK
  DISPATCHED
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
}

enum OrderType {
  B2C
  B2B
}

model Order {
  id                    String        @id @default(uuid())
  orderNumber           String        @unique // e.g. "SG-2026-10492"
  type                  OrderType     @default(B2C)
  userId                String?
  user                  User?         @relation(fields: [userId], references: [id])
  organizationId        String?
  organization          Organization? @relation(fields: [organizationId], references: [id])
  
  // Customer Checkout Details
  customerName          String
  customerEmail         String
  customerPhone         String
  gstin                 String?
  
  // Shipping Address Snapshot
  shippingAddress       Json          // Full address snapshot
  destinationStateCode  String        // e.g. "08" (Intra) vs Other (Inter)
  
  // Financial Totals in Integer Paise
  itemsSubtotalPaise    BigInt
  customizationTotalPaise BigInt      @default(0)
  discountTotalPaise    BigInt        @default(0)
  taxableAmountPaise    BigInt
  taxTotalPaise         BigInt        // Total GST
  cgstPaise             BigInt        @default(0) // Intra-state (9%)
  sgstPaise             BigInt        @default(0) // Intra-state (9%)
  igstPaise             BigInt        @default(0) // Inter-state (18%)
  shippingTotalPaise    BigInt        @default(0)
  grandTotalPaise       BigInt        // Final payable
  
  // Status Tracking
  orderStatus           OrderStatus   @default(PENDING)
  paymentStatus         PaymentStatus @default(PENDING)
  paymentMethod         String        // "RAZORPAY" | "MOCK" | "CORPORATE_CREDIT"
  
  // Batch 4: Stock Reservation & Idempotency
  idempotencyKey        String?       @unique
  reservationExpiresAt  DateTime?     // 15-minute stock hold window
  guestLookupToken      String?       // Random high-entropy token for guest lookup
  
  // Relationships
  items                 OrderItem[]
  payments              Payment[]
  shipments             Shipment[]
  statusHistory         OrderStatusHistory[]
  
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([reservationExpiresAt])
  @@index([orderStatus])
  @@index([paymentStatus])
}

model OrderItem {
  id                    String          @id @default(uuid())
  orderId               String
  order                 Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId             String?
  variant               ProductVariant? @relation(fields: [variantId], references: [id])
  
  // Immutable Historical Snapshot
  productName           String
  sku                   String
  hsnCode               String
  taxRatePercent        Int
  unitPricePaise        Int             // Price per unit in paise at time of purchase
  quantity              Int
  subtotalPaise         BigInt
  
  // Personalization details
  isCustomized          Boolean         @default(false)
  customizationNote     String?
  customizationFeePaise Int             @default(0)
  proofImageUrl         String?         // URL of rendered proof
  customizationMeta     Json?           // Structured text, font, coordinates
  
  createdAt             DateTime        @default(now())
}

model Payment {
  id                    String        @id @default(uuid())
  orderId               String
  order                 Order         @relation(fields: [orderId], references: [id])
  gateway               String        // "RAZORPAY" | "MOCK"
  gatewayOrderId        String        // Gateway internal order ID
  gatewayPaymentId      String?       // Gateway payment ID upon capture
  gatewaySignature      String?       // Signature for verification
  amountPaise           BigInt        // Amount charged in integer paise
  currency              String        @default("INR")
  status                PaymentStatus @default(PENDING)
  errorMessage          String?       // Failure details from gateway
  capturedAt            DateTime?     // Verification timestamp
  idempotencyKey        String?       @unique
  rawEventPayload       Json?         // Full audit of gateway response/webhook
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([gatewayOrderId])
  @@index([gatewayPaymentId])
  @@index([status])
}

model WebhookEvent {
  id                    String        @id @default(uuid())
  gateway               String        @default("RAZORPAY")
  eventId               String        @unique // Gateway unique event ID (e.g. evt_xxxx)
  eventType             String        // payment.captured, payment.failed, order.paid
  payloadHash           String        // SHA-256 hash of exact raw request body
  status                String        @default("PROCESSED") // PROCESSED | RECONCILIATION_REQUIRED | FAILED
  processedAt           DateTime      @default(now())
  createdAt             DateTime      @default(now())

  @@index([eventId])
  @@index([eventType])
  @@index([status])
}

model PaymentReconciliation {
  id                    String        @id @default(uuid())
  orderId               String?
  orderNumber           String
  gatewayPaymentId      String
  gatewayOrderId        String
  expectedAmountPaise   BigInt
  receivedAmountPaise   BigInt
  discrepancyType       String        // LATE_PAYMENT_EXPIRED_HOLD | AMOUNT_MISMATCH | UNAUTHORIZED_CURRENCY | UNKNOWN_ORDER
  status                String        @default("OPEN") // OPEN | RESOLVED | REFUNDED | DISMISSED
  notes                 String?
  resolvedBy            String?
  resolvedAt            DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([orderNumber])
  @@index([gatewayPaymentId])
  @@index([discrepancyType])
  @@index([status])
}
```

### 2.5 Multi-Address Shipments & Split Dispatches (B2B)

```prisma
model Shipment {
  id              String    @id @default(uuid())
  orderId         String
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  recipientName   String
  recipientEmail  String?
  recipientPhone  String
  addressStreet   String
  city            String
  state           String
  pincode         String
  carrierPartner  String?   // "Delhivery Surface" | "BlueDart Air"
  awbNumber       String?   @unique
  trackingUrl     String?   // Validated HTTP/HTTPS courier tracking URL
  dispatchStatus  String    @default("PENDING") // PENDING, DISPATCHED, DELIVERED
  dispatchedAt    DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([orderId])
  @@index([awbNumber])
}
```

### 2.6 Audit Logging & Status History

```prisma
model OrderStatusHistory {
  id          String      @id @default(uuid())
  orderId     String
  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fromStatus  OrderStatus
  toStatus    OrderStatus
  changedBy   String      // User ID or "SYSTEM" or "WEBHOOK"
  notes       String?
  createdAt   DateTime    @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String   // e.g. "PRODUCT_PRICE_UPDATE", "RFQ_APPROVED"
  resource    String   // e.g. "Product:prod-1"
  details     Json?    // Before/After diffs
  ipAddress   String?
  createdAt   DateTime @default(now())
}
```

### 2.7 Personalization & Artwork Proofs (Batch 7)

```prisma
model ArtworkUpload {
  id                String    @id @default(uuid())
  fileKey           String    @unique // e.g. "customer-artwork/1730200000-abcd.png"
  originalFilename  String
  mimeType          String    // Genuine verified magic bytes: "image/jpeg" | "image/png" | "image/webp"
  sizeBytes         Int       // <= 5MB authoritative threshold
  fileHash          String    // SHA-256 binary hash for tamper detection
  storageFolder     String    @default("customer-artwork") // "customer-artwork" | "proofs" | "logos"
  uploadedByUserId  String?
  uploadedByUser    User?     @relation(fields: [uploadedByUserId], references: [id])
  guestSessionToken String?   // Guest checkout token isolation
  status            String    @default("ACTIVE") // "ACTIVE" | "ATTACHED" | "ABANDONED"
  expiresAt         DateTime? // 7-day retention for unattached artwork
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([uploadedByUserId])
  @@index([guestSessionToken])
  @@index([status])
}

model OrderPersonalization {
  id                    String    @id @default(uuid())
  orderItemId           String    @unique
  orderItem             OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  personalizationType   String    @default("TEXT_ENGRAVING") // "TEXT_ENGRAVING" | "PHOTO_PRINT" | "LOGO_BRANDING" | "BESPOKE_COMBO"
  engravedText          String?   // Max 32 chars
  fontFamily            String?
  giftNote              String?   // Max 200 chars
  ribbonColor           String?
  boxWrapStyle          String?   // e.g. "Vintage Wooden Keepsake Crate (+₹150)"
  waxSealColor          String?
  artworkUploadId       String?
  cropSettings          Json?     // { x, y, width, height, zoom, rotation }
  placementSettings     Json?     // { position: "CENTER" | "LID" | ..., scale, offsetX, offsetY }
  proofImageUrl         String?   // Authorized streaming route: "/api/personalization/uploads/[id]/file"
  proofVersion          Int       @default(1)
  approvalStatus        String    @default("DRAFT") // "DRAFT" | "APPROVED_BY_CUSTOMER" | "ARTWORK_VERIFIED_BY_STAFF" | "REJECTED_FOR_REWORK"
  approvedAt            DateTime?
  approvedBy            String?   // Customer email / staff identifier
  customizationFeePaise Int       @default(0) // Authoritative fee calculated on server in integer paise
  staffNotes            String?   // Notes from artisan inspection in admin portal
  metadata              Json?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([orderItemId])
  @@index([artworkUploadId])
### 2.8 Invoicing, GST Sequences & Transactional Emails (Batch 8)

```prisma
model Invoice {
  id                     String    @id @default(uuid())
  invoiceNumber          String    @unique // e.g. "SG/26-27/0001" (Max 16 chars, Rule 46(b))
  orderId                String    @unique
  orderNumber            String
  invoiceDate            DateTime  @default(now())
  financialYear          String    // e.g. "2026-27"
  series                 String    @default("SG")
  sequenceNumber         Int

  // Supplier Snapshot
  supplierLegalName      String
  supplierTradeName      String?
  supplierGstin          String
  supplierAddress        Json
  supplierState          String
  supplierStateCode      String

  // Customer / Recipient Snapshot
  customerName           String
  customerEmail          String
  customerPhone          String
  customerGstin          String?
  billingAddress         Json
  shippingAddress        Json
  placeOfSupply          String
  placeOfSupplyStateCode String
  isIntraState           Boolean   @default(true)

  // Financial Snapshots in Integer Paise
  itemsSubtotalPaise     BigInt
  customizationTotalPaise BigInt   @default(0)
  discountTotalPaise     BigInt    @default(0)
  taxableAmountPaise     BigInt
  cgstPaise              BigInt    @default(0)
  sgstPaise              BigInt    @default(0)
  igstPaise              BigInt    @default(0)
  taxTotalPaise          BigInt
  shippingTotalPaise     BigInt    @default(0)
  grandTotalPaise        BigInt

  // Snapshot of line items
  itemsJson              Json      // Array of InvoiceItemSnapshot with HSN, rate, taxable, CGST, SGST, IGST

  // Document Storage
  pdfStorageKey          String?   // Private storage key: "invoices/SG_26-27_0001.pdf"
  pdfGeneratedAt         DateTime?
  isSample               Boolean   @default(false)
  status                 String    @default("ISSUED") // "ISSUED" | "CANCELLED" | "AMENDED"

  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  order                  Order     @relation(fields: [orderId], references: [id])

  @@index([orderNumber])
  @@index([financialYear])
  @@index([invoiceDate])
}

model InvoiceSequence {
  id            String   @id @default(uuid())
  financialYear String   // "2026-27"
  series        String   @default("SG")
  lastSequence  Int      @default(0)
  updatedAt     DateTime @updatedAt

  @@unique([financialYear, series])
}

model EmailOutbox {
  id              String    @id @default(uuid())
  idempotencyKey  String    @unique
  eventType       String    // "ORDER_CONFIRMATION" | "INVOICE_AVAILABLE" | "SHIPMENT_DISPATCHED"
  recipientEmail  String
  recipientName   String?
  subject         String
  htmlBody        String
  textBody        String?
  attachmentPath  String?   // Authorized private storage key
  orderNumber     String?
  invoiceNumber   String?

  status          String    @default("PENDING") // "PENDING" | "PROCESSING" | "SENT" | "FAILED"
  attempts        Int       @default(0)
  maxAttempts     Int       @default(5)
  nextRetryAt     DateTime  @default(now())
  lastError       String?
  sentAt          DateTime?
  lockedAt        DateTime?
  lockedBy        String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status, nextRetryAt])
  @@index([orderNumber])
}

model SellerConfig {
  id               String   @id @default("default-seller-config")
  legalName        String
  tradeName        String?
  gstin            String
  registeredStreet String
  city             String
  state            String
  stateCode        String   // "08" (Rajasthan)
  pincode          String
  contactEmail     String
  contactPhone     String
  invoicePrefix    String   @default("SG")
  invoiceFooter    String?
  isVerified       Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### 2.9 Corporate B2B Architecture (Batch 9A)

```prisma
enum CorporateRole {
  OWNER
  REQUESTER
  APPROVER
  FINANCE
}

enum CorporateAccountStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  SUSPENDED
}

model CorporateMembership {
  id             String         @id @default(uuid())
  userId         String
  organizationId String
  role           CorporateRole  @default(REQUESTER)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user           User           @relation(fields: [userId], references: [id])
  organization   Organization   @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@index([userId])
}

model CorporateAddress {
  id             String         @id @default(uuid())
  organizationId String
  label          String
  recipientName  String
  recipientPhone String
  recipientEmail String?
  addressLine1   String
  addressLine2   String?
  city           String
  state          String
  stateCode      String
  pincode        String
  isDefault      Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
}

model CorporateRFQ {
  id                     String         @id @default(uuid())
  rfqNumber              String         @unique
  organizationId         String
  createdById            String
  status                 String         @default("DRAFT")
  brandingRequirements   String?
  packagingRequirements  String?
  personalizationNotes   String?
  requiredDeliveryDate   DateTime?
  estimatedDeliveryCount Int            @default(1)
  estimatedBudgetPaise   BigInt?
  customerNotes          String?
  internalAdminNotes     String?
  reviewedBy             String?
  reviewedAt             DateTime?
  quotedAt               DateTime?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  organization           Organization   @relation(fields: [organizationId], references: [id])
  createdBy              User           @relation(fields: [createdById], references: [id])
  items                  CorporateRFQItem[]
  quotes                 CorporateQuote[]

  @@index([organizationId])
  @@index([status])
}

model CorporateRFQItem {
  id                  String         @id @default(uuid())
  rfqId               String
  productId           String
  variantId           String?
  productName         String
  sku                 String
  requestedQuantity   Int
  brandingNotes       String?
  packagingNotes      String?
  createdAt           DateTime       @default(now())

  rfq                 CorporateRFQ   @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  product             Product        @relation(fields: [productId], references: [id])
  variant             ProductVariant? @relation(fields: [variantId], references: [id])

  @@index([rfqId])
}

model CorporateQuote {
  id                     String         @id @default(uuid())
  quoteNumber            String         @unique
  rfqId                  String
  organizationId         String
  revisionNumber         Int            @default(1)
  isCurrent              Boolean        @default(true)
  status                 String         @default("ISSUED")
  itemsSubtotalPaise     BigInt
  personalizationFeePaise BigInt        @default(0)
  packagingFeePaise      BigInt         @default(0)
  shippingTotalPaise     BigInt         @default(0)
  discountTotalPaise     BigInt         @default(0)
  taxableAmountPaise     BigInt
  cgstPaise              BigInt         @default(0)
  sgstPaise              BigInt         @default(0)
  igstPaise              BigInt         @default(0)
  taxTotalPaise          BigInt
  grandTotalPaise        BigInt
  validUntil             DateTime
  commercialTerms        String?
  customerVisibleNotes   String?
  internalAdminNotes     String?
  preparedById           String
  decisionById           String?
  decisionAt             DateTime?
  decisionNotes          String?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  rfq                    CorporateRFQ   @relation(fields: [rfqId], references: [id])
  organization           Organization   @relation(fields: [organizationId], references: [id])
  items                  CorporateQuoteItem[]
  orderGroups            CorporateOrderGroup[]

  @@index([organizationId])
  @@index([rfqId])
  @@index([status])
}

model CorporateQuoteItem {
  id                     String         @id @default(uuid())
  quoteId                String
  productId              String
  variantId              String?
  productName            String
  sku                    String
  hsnCode                String
  quantity               Int
  unitPricePaise         Int
  subtotalPaise          BigInt
  discountPaise          BigInt         @default(0)
  taxRatePercent         Int
  cgstPaise              BigInt         @default(0)
  sgstPaise              BigInt         @default(0)
  igstPaise              BigInt         @default(0)
  taxTotalPaise          BigInt
  grandTotalPaise        BigInt
  personalizationChargePaise BigInt     @default(0)
  createdAt              DateTime       @default(now())

  quote                  CorporateQuote @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@index([quoteId])
}

model CorporatePriceAgreement {
  id             String         @id @default(uuid())
  organizationId String
  title          String
  agreementCode  String         @unique
  effectiveFrom  DateTime
  effectiveTo    DateTime
  isActive       Boolean        @default(true)
  notes          String?
  createdByAdminId String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id])
  tiers          CorporatePriceTier[]

  @@index([organizationId])
  @@index([isActive])
}

model CorporatePriceTier {
  id             String         @id @default(uuid())
  agreementId    String
  productId      String
  variantId      String?
  minQuantity    Int
  maxQuantity    Int?
  unitPricePaise Int
  createdAt      DateTime       @default(now())

  agreement      CorporatePriceAgreement @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  product        Product        @relation(fields: [productId], references: [id])
  variant        ProductVariant? @relation(fields: [variantId], references: [id])

  @@index([agreementId])
  @@index([productId])
}

model CorporateOrderGroup {
  id                 String         @id @default(uuid())
  groupOrderNumber   String         @unique
  organizationId     String
  quoteId            String
  createdById        String
  status             String         @default("PENDING_PAYMENT")
  totalRecipients    Int
  totalUnits         Int
  grandTotalPaise    BigInt
  paymentGateway     String         @default("RAZORPAY")
  paymentStatus      String         @default("PENDING")
  gatewayOrderId     String?
  gatewayPaymentId   String?
  paidAt             DateTime?
  reconciledAt       DateTime?
  notes              String?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  organization       Organization   @relation(fields: [organizationId], references: [id])
  quote              CorporateQuote @relation(fields: [quoteId], references: [id])
  createdBy          User           @relation(fields: [createdById], references: [id])
  orders             Order[]
  deliveryAllocations CorporateDeliveryAllocation[]

  @@index([organizationId])
  @@index([quoteId])
  @@index([groupOrderNumber])
}

model CorporateDeliveryAllocation {
  id                 String         @id @default(uuid())
  orderGroupId       String
  childOrderId       String?
  recipientName      String
  recipientPhone     String
  recipientEmail     String?
  addressLine1       String
  addressLine2       String?
  city               String
  state              String
  stateCode          String
  pincode            String
  productId          String
  variantId          String?
  sku                String
  quantity           Int
  status             String         @default("PENDING")
  createdAt          DateTime       @default(now())

  orderGroup         CorporateOrderGroup @relation(fields: [orderGroupId], references: [id], onDelete: Cascade)

  @@index([orderGroupId])
### 2.10 Store Configuration, Business Settings & Audit Logging (Batch 10)

```prisma
model StoreConfig {
  id                          String    @id @default("default")
  storeName                   String    @default("Snappy Gifts")
  supportEmail                String    @default("support@snappygifts.in")
  supportPhone                String    @default("+91 145 200 1234")
  operatingHours              String    @default("Mon-Sat 9:30 AM - 6:30 PM IST")
  headquartersAddress         String    @default("Ajmer Central Gifting Hub, Rajasthan - 305001")
  
  // Shipping Fees in Integer Paise
  standardShippingFeePaise    BigInt    @default(9900)  // ₹99
  freeShippingThresholdPaise  BigInt    @default(99900) // ₹999
  expressShippingFeePaise     BigInt    @default(19900) // ₹199
  shippingInstructions        String    @default("Dispatched via Air Express or Surface Courier across India within 24-48 hours.")
  
  // Inventory Alert Triggers
  lowStockThreshold           Int       @default(100)
  outOfStockThreshold         Int       @default(0)
  autoNotifyLowStock          Boolean   @default(true)
  
  // Personalization & Packaging Rules
  allowCustomText             Boolean   @default(true)
  allowArtworkUpload          Boolean   @default(true)
  maxArtworkUploadBytes       Int       @default(5242880) // 5MB
  woodenCrateSurchargePaise   BigInt    @default(15000)   // ₹150
  
  updatedAt                   DateTime  @updatedAt
  updatedBy                   String?
}

// In AuditLog model, createdAt index is established for performant timeline querying:
// @@index([createdAt])
```

### 2.11 Distributed Rate Limiting & Storage Architecture (Batch 11)

In production multi-instance serverless environments, rate-limit state is decoupled from ephemeral application memory:

* **Distributed Rate Limiting Storage Engine:**
  - Backed by Upstash Redis REST interface (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
  - Key Schema: `snappy:rl:{operation}:{bucketIdentifier}` (e.g. `snappy:rl:AUTH_LOGIN:192.168.1.1:user@example.com`).
  - Atomic Windowing Pipeline: `INCR` + conditional `EXPIRE {windowSeconds} NX` + `TTL`.
  - Development Fallback: Isolated in-memory sliding window store (`DEV_RATE_LIMITER_STORE`).
  - Production Guard: Fail-closed policy rejecting abuse-sensitive operations with HTTP 429 if the configured distributed backend is uncontactable.

* **Artwork Storage Key Format:**
  - Encrypted UUID naming convention: `artwork/{uuid}.{ext}` (MIME and magic-byte verified).
  - Storage path exposure prevention: Internal filesystem absolute paths are never returned in public API payloads.
```

---

## 3. Money & Tax Integrity Rules

1. **Storage Unit:** Every column ending in `Paise` uses PostgreSQL `BIGINT` or `INTEGER`.  
   Example: ₹1,299.00 is stored as `129900`.
2. **Tax Engine Calculation:**
   - Rajasthan State Code is `08`.
   - If destination `stateCode === "08"` (Intra-state):
     - `cgstPaise = (taxableAmountPaise * taxRatePercent) / 200`
     - `sgstPaise = (taxableAmountPaise * taxRatePercent) / 200`
     - `igstPaise = 0`
   - If destination `stateCode !== "08"` (Inter-state):
     - `cgstPaise = 0`
     - `sgstPaise = 0`
     - `igstPaise = (taxableAmountPaise * taxRatePercent) / 100`
3. **Integer Invariant:**
   `grandTotalPaise = taxableAmountPaise + taxTotalPaise + shippingTotalPaise`
4. **Rounding Policy:** Integer division truncation with remainder check ensures no fractional paise discrepancy between gateway charge and invoice lines.
