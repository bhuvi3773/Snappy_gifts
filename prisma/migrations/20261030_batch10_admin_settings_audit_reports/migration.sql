-- Batch 10 Migration: StoreConfig and AuditLog Index
-- Target Database: PostgreSQL 16+

-- CreateTable: StoreConfig
CREATE TABLE IF NOT EXISTS "StoreConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'Snappy Gifts',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@snappygifts.in',
    "supportPhone" TEXT NOT NULL DEFAULT '+91 145 200 1234',
    "operatingHours" TEXT NOT NULL DEFAULT 'Mon-Sat 9:30 AM - 6:30 PM IST',
    "headquartersAddress" TEXT NOT NULL DEFAULT 'Ajmer Central Gifting Hub, Rajasthan - 305001',
    "standardShippingFeePaise" BIGINT NOT NULL DEFAULT 9900,
    "freeShippingThresholdPaise" BIGINT NOT NULL DEFAULT 99900,
    "expressShippingFeePaise" BIGINT NOT NULL DEFAULT 19900,
    "shippingInstructions" TEXT,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 100,
    "outOfStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "autoNotifyLowStock" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomText" BOOLEAN NOT NULL DEFAULT true,
    "allowArtworkUpload" BOOLEAN NOT NULL DEFAULT true,
    "maxArtworkUploadBytes" INTEGER NOT NULL DEFAULT 5242880,
    "woodenCrateSurchargePaise" BIGINT NOT NULL DEFAULT 15000,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "StoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AuditLog_createdAt_idx
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
