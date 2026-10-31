-- CreateEnum
CREATE TYPE "CorporateRole" AS ENUM ('OWNER', 'REQUESTER', 'APPROVER', 'FINANCE');

-- CreateEnum
CREATE TYPE "CorporateAccountStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "legalName" TEXT,
ADD COLUMN "displayName" TEXT,
ADD COLUMN "companyEmail" TEXT,
ADD COLUMN "contactPerson" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "registeredAddress" JSONB,
ADD COLUMN "businessDetails" TEXT,
ADD COLUMN "status" "CorporateAccountStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ALTER COLUMN "gstin" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateTable
CREATE TABLE "CorporateMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CorporateRole" NOT NULL DEFAULT 'REQUESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateMembership_organizationId_userId_key" ON "CorporateMembership"("organizationId", "userId");
CREATE INDEX "CorporateMembership_organizationId_idx" ON "CorporateMembership"("organizationId");
CREATE INDEX "CorporateMembership_userId_idx" ON "CorporateMembership"("userId");

-- CreateTable
CREATE TABLE "CorporateAddress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "department" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateAddress_organizationId_idx" ON "CorporateAddress"("organizationId");
CREATE INDEX "CorporateAddress_pincode_idx" ON "CorporateAddress"("pincode");

-- CreateTable
CREATE TABLE "CorporateRFQ" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiredDeliveryDate" TIMESTAMP(3),
    "deliveryLocationsCount" INTEGER NOT NULL DEFAULT 1,
    "brandingLogoRequired" BOOLEAN NOT NULL DEFAULT false,
    "customPackagingRequired" BOOLEAN NOT NULL DEFAULT false,
    "estimatedBudgetPaise" BIGINT,
    "additionalInstructions" TEXT,
    "internalNotes" TEXT,
    "customerNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateRFQ_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateRFQ_rfqNumber_key" ON "CorporateRFQ"("rfqNumber");
CREATE INDEX "CorporateRFQ_organizationId_idx" ON "CorporateRFQ"("organizationId");
CREATE INDEX "CorporateRFQ_status_idx" ON "CorporateRFQ"("status");

-- CreateTable
CREATE TABLE "CorporateRFQItem" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "personalizationNote" TEXT,
    "logoUrl" TEXT,
    "estimatedUnitBudgetPaise" BIGINT,

    CONSTRAINT "CorporateRFQItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateRFQItem_rfqId_idx" ON "CorporateRFQItem"("rfqId");
CREATE INDEX "CorporateRFQItem_productId_idx" ON "CorporateRFQItem"("productId");

-- CreateTable
CREATE TABLE "CorporateQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "isLatestRevision" BOOLEAN NOT NULL DEFAULT true,
    "rfqId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "itemsSubtotalPaise" BIGINT NOT NULL,
    "customizationTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "discountTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "taxableAmountPaise" BIGINT NOT NULL,
    "taxTotalPaise" BIGINT NOT NULL,
    "cgstPaise" BIGINT NOT NULL DEFAULT 0,
    "sgstPaise" BIGINT NOT NULL DEFAULT 0,
    "igstPaise" BIGINT NOT NULL DEFAULT 0,
    "shippingTotalPaise" BIGINT NOT NULL DEFAULT 0,
    "grandTotalPaise" BIGINT NOT NULL,
    "commercialTerms" TEXT,
    "customerNotes" TEXT,
    "internalAdminNotes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateQuote_quoteNumber_revision_key" ON "CorporateQuote"("quoteNumber", "revision");
CREATE INDEX "CorporateQuote_organizationId_idx" ON "CorporateQuote"("organizationId");
CREATE INDEX "CorporateQuote_quoteNumber_idx" ON "CorporateQuote"("quoteNumber");
CREATE INDEX "CorporateQuote_rfqId_idx" ON "CorporateQuote"("rfqId");
CREATE INDEX "CorporateQuote_status_idx" ON "CorporateQuote"("status");

-- CreateTable
CREATE TABLE "CorporateQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "sku" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "taxRatePercent" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "customizationFeePaise" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "lineSubtotalPaise" BIGINT NOT NULL,
    "lineTaxPaise" BIGINT NOT NULL,
    "lineTotalPaise" BIGINT NOT NULL,
    "personalizationDetails" JSONB,

    CONSTRAINT "CorporateQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateQuoteItem_quoteId_idx" ON "CorporateQuoteItem"("quoteId");
CREATE INDEX "CorporateQuoteItem_sku_idx" ON "CorporateQuoteItem"("sku");

-- CreateTable
CREATE TABLE "CorporatePriceAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "agreementName" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "negotiatedBy" TEXT NOT NULL,
    "negotiationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporatePriceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporatePriceAgreement_organizationId_idx" ON "CorporatePriceAgreement"("organizationId");
CREATE INDEX "CorporatePriceAgreement_productId_idx" ON "CorporatePriceAgreement"("productId");
CREATE INDEX "CorporatePriceAgreement_isActive_idx" ON "CorporatePriceAgreement"("isActive");

-- CreateTable
CREATE TABLE "CorporatePriceTier" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "CorporatePriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporatePriceTier_agreementId_idx" ON "CorporatePriceTier"("agreementId");

-- CreateTable
CREATE TABLE "CorporateOrderGroup" (
    "id" TEXT NOT NULL,
    "groupOrderNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT,
    "createdById" TEXT NOT NULL,
    "totalDestinations" INTEGER NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "grandTotalPaise" BIGINT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'ONLINE_UPI',
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateOrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateOrderGroup_groupOrderNumber_key" ON "CorporateOrderGroup"("groupOrderNumber");
CREATE UNIQUE INDEX "CorporateOrderGroup_quoteId_key" ON "CorporateOrderGroup"("quoteId");
CREATE INDEX "CorporateOrderGroup_organizationId_idx" ON "CorporateOrderGroup"("organizationId");
CREATE INDEX "CorporateOrderGroup_groupOrderNumber_idx" ON "CorporateOrderGroup"("groupOrderNumber");

-- CreateTable
CREATE TABLE "CorporateDeliveryAllocation" (
    "id" TEXT NOT NULL,
    "orderGroupId" TEXT NOT NULL,
    "childOrderId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "department" TEXT,
    "customGiftNote" TEXT,
    "quantity" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "sku" TEXT NOT NULL,
    "allocatedTotalPaise" BIGINT NOT NULL,
    "shipmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateDeliveryAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateDeliveryAllocation_childOrderId_key" ON "CorporateDeliveryAllocation"("childOrderId");
CREATE INDEX "CorporateDeliveryAllocation_orderGroupId_idx" ON "CorporateDeliveryAllocation"("orderGroupId");
CREATE INDEX "CorporateDeliveryAllocation_pincode_idx" ON "CorporateDeliveryAllocation"("pincode");

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "corporateOrderGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Order_corporateOrderGroupId_idx" ON "Order"("corporateOrderGroupId");

-- AddForeignKey
ALTER TABLE "CorporateMembership" ADD CONSTRAINT "CorporateMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateMembership" ADD CONSTRAINT "CorporateMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateAddress" ADD CONSTRAINT "CorporateAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRFQ" ADD CONSTRAINT "CorporateRFQ_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateRFQ" ADD CONSTRAINT "CorporateRFQ_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRFQItem" ADD CONSTRAINT "CorporateRFQItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "CorporateRFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateRFQItem" ADD CONSTRAINT "CorporateRFQItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateQuote" ADD CONSTRAINT "CorporateQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "CorporateRFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateQuote" ADD CONSTRAINT "CorporateQuote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateQuote" ADD CONSTRAINT "CorporateQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateQuote" ADD CONSTRAINT "CorporateQuote_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateQuoteItem" ADD CONSTRAINT "CorporateQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CorporateQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporatePriceAgreement" ADD CONSTRAINT "CorporatePriceAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporatePriceAgreement" ADD CONSTRAINT "CorporatePriceAgreement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporatePriceTier" ADD CONSTRAINT "CorporatePriceTier_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CorporatePriceAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateOrderGroup" ADD CONSTRAINT "CorporateOrderGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorporateOrderGroup" ADD CONSTRAINT "CorporateOrderGroup_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CorporateQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateOrderGroup" ADD CONSTRAINT "CorporateOrderGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateDeliveryAllocation" ADD CONSTRAINT "CorporateDeliveryAllocation_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "CorporateOrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorporateDeliveryAllocation" ADD CONSTRAINT "CorporateDeliveryAllocation_childOrderId_fkey" FOREIGN KEY ("childOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_corporateOrderGroupId_fkey" FOREIGN KEY ("corporateOrderGroupId") REFERENCES "CorporateOrderGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
