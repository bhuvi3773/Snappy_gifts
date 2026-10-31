-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "capturedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_gatewayPaymentId_idx" ON "Payment"("gatewayPaymentId");

-- CreateTable WebhookEvent
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateTable PaymentReconciliation
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "gatewayPaymentId" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "expectedAmountPaise" BIGINT,
    "receivedAmountPaise" BIGINT NOT NULL,
    "discrepancyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "rawEvent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReconciliation_gatewayPaymentId_idx" ON "PaymentReconciliation"("gatewayPaymentId");
CREATE INDEX "PaymentReconciliation_orderNumber_idx" ON "PaymentReconciliation"("orderNumber");
CREATE INDEX "PaymentReconciliation_status_idx" ON "PaymentReconciliation"("status");
