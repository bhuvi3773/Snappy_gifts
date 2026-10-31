-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialYear" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT 'SG',
    "sequenceNumber" INTEGER NOT NULL,
    "supplierLegalName" TEXT NOT NULL,
    "supplierTradeName" TEXT,
    "supplierGstin" TEXT NOT NULL,
    "supplierAddress" JSONB NOT NULL,
    "supplierState" TEXT NOT NULL,
    "supplierStateCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerGstin" TEXT,
    "billingAddress" JSONB NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "placeOfSupply" TEXT NOT NULL,
    "placeOfSupplyStateCode" TEXT NOT NULL,
    "isIntraState" BOOLEAN NOT NULL,
    "itemsSubtotalPaise" BIGINT NOT NULL,
    "customizationTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "discountTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "taxableAmountPaise" BIGINT NOT NULL,
    "cgstPaise" BIGINT NOT NULL DEFAULT 0,
    "sgstPaise" BIGINT NOT NULL DEFAULT 0,
    "igstPaise" BIGINT NOT NULL DEFAULT 0,
    "taxTotalPaise" BIGINT NOT NULL,
    "shippingTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "grandTotalPaise" BIGINT NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "eInvoiceStatus" TEXT NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "irn" TEXT,
    "signedQrData" TEXT,
    "rule46Declaration" TEXT,
    "signatureMode" TEXT NOT NULL DEFAULT 'PHYSICAL_SIGNATURE_ON_PRINT',
    "physicalSignatureConfirmedBy" TEXT,
    "physicalSignatureConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT 'SG',
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "attachmentKey" TEXT,
    "attachmentFilename" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "gstin" TEXT NOT NULL,
    "pan" TEXT,
    "registeredStreet" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Rajasthan',
    "stateCode" TEXT NOT NULL DEFAULT '08',
    "pincode" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'SG',
    "authorizedSignatoryName" TEXT,
    "authorizedSignatoryDesignation" TEXT,
    "invoiceFooterTerms" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "eInvoiceStatus" TEXT NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "eInvoiceExemptionReason" TEXT,
    "eInvoiceConfirmedBy" TEXT,
    "eInvoiceConfirmedAt" TIMESTAMP(3),
    "panAggregateTurnoverExceeds5Cr" BOOLEAN NOT NULL DEFAULT false,
    "signatureMode" TEXT NOT NULL DEFAULT 'PHYSICAL_SIGNATURE_ON_PRINT',
    "digitalSignatureConfigured" BOOLEAN NOT NULL DEFAULT false,
    "electronicInvoiceSignatureExemptionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "electronicInvoiceExemptionConfirmedBy" TEXT,
    "electronicInvoiceExemptionConfirmedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SellerConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "invoicePhysicallySignedBy" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "invoicePhysicallySignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_orderNumber_idx" ON "Invoice"("orderNumber");

-- CreateIndex
CREATE INDEX "Invoice_financialYear_idx" ON "Invoice"("financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_financialYear_series_sequenceNumber_key" ON "Invoice"("financialYear", "series", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_financialYear_series_key" ON "InvoiceSequence"("financialYear", "series");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextRetryAt_idx" ON "EmailOutbox"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_orderNumber_idx" ON "EmailOutbox"("orderNumber");

-- CreateIndex
CREATE INDEX "EmailOutbox_idempotencyKey_idx" ON "EmailOutbox"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
