-- CreateTable
CREATE TABLE "ArtworkUpload" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileHash" TEXT,
    "storageFolder" TEXT NOT NULL DEFAULT 'proofs',
    "uploadedByUserId" TEXT,
    "guestSessionToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPersonalization" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "personalizationType" TEXT NOT NULL DEFAULT 'TEXT_ENGRAVING',
    "engravedText" TEXT,
    "fontFamily" TEXT,
    "giftNote" TEXT,
    "ribbonColor" TEXT,
    "boxWrapStyle" TEXT,
    "waxSealColor" TEXT,
    "artworkUploadId" TEXT,
    "cropSettings" JSONB,
    "placementSettings" JSONB,
    "proofImageUrl" TEXT,
    "proofAssetKey" TEXT,
    "proofVersion" INTEGER NOT NULL DEFAULT 1,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED_BY_CUSTOMER',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "customerApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "customerApprovedAt" TIMESTAMP(3),
    "customerApprovedBy" TEXT,
    "staffReviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "staffReviewedAt" TIMESTAMP(3),
    "staffReviewedBy" TEXT,
    "customizationFeePaise" INTEGER NOT NULL DEFAULT 0,
    "staffNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPersonalization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkUpload_fileKey_key" ON "ArtworkUpload"("fileKey");

-- CreateIndex
CREATE INDEX "ArtworkUpload_fileKey_idx" ON "ArtworkUpload"("fileKey");

-- CreateIndex
CREATE INDEX "ArtworkUpload_uploadedByUserId_idx" ON "ArtworkUpload"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "ArtworkUpload_guestSessionToken_idx" ON "ArtworkUpload"("guestSessionToken");

-- CreateIndex
CREATE INDEX "ArtworkUpload_status_idx" ON "ArtworkUpload"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPersonalization_orderItemId_key" ON "OrderPersonalization"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderPersonalization_orderItemId_idx" ON "OrderPersonalization"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderPersonalization_artworkUploadId_idx" ON "OrderPersonalization"("artworkUploadId");

-- CreateIndex
CREATE INDEX "OrderPersonalization_approvalStatus_idx" ON "OrderPersonalization"("approvalStatus");

-- CreateIndex
CREATE INDEX "OrderPersonalization_customerApprovalStatus_idx" ON "OrderPersonalization"("customerApprovalStatus");

-- CreateIndex
CREATE INDEX "OrderPersonalization_staffReviewStatus_idx" ON "OrderPersonalization"("staffReviewStatus");

-- AddForeignKey
ALTER TABLE "ArtworkUpload" ADD CONSTRAINT "ArtworkUpload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPersonalization" ADD CONSTRAINT "OrderPersonalization_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPersonalization" ADD CONSTRAINT "OrderPersonalization_artworkUploadId_fkey" FOREIGN KEY ("artworkUploadId") REFERENCES "ArtworkUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
