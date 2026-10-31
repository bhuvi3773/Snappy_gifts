-- Migration: 20261029_batch4_checkout_order_reservation
-- Description: Add 15-minute stock reservation tracking, idempotency key, and guest lookup token to Order

-- AlterEnum
ALTER TYPE "InventoryAdjustmentReason" ADD VALUE IF NOT EXISTS 'RESERVATION_EXPIRED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "guestLookupToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_reservationExpiresAt_idx" ON "Order"("reservationExpiresAt");
