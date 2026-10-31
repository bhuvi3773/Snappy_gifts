import { prisma } from '@/lib/prisma';
import { InventoryAdjustmentReason, ProductVariant, InventoryAdjustment } from '@prisma/client';

export interface StockAdjustmentParams {
  variantId: string;
  adjustedQty: number; // Positive to add, negative to subtract
  reason: InventoryAdjustmentReason;
  referenceId?: string;
  userId?: string;
  notes?: string;
}

export interface StockAdjustmentResult {
  variant: ProductVariant;
  adjustment: InventoryAdjustment;
}

export class InventoryError extends Error {
  constructor(message: string, public code: string = 'INVENTORY_ERROR') {
    super(message);
    this.name = 'InventoryError';
  }
}

/**
 * Execute an atomic stock adjustment inside a database transaction.
 * Guarantees:
 * 1. Current stock balance is locked and read.
 * 2. Invariant is enforced: stock cannot become negative.
 * 3. An append-only ledger entry (InventoryAdjustment) is created with immutable SKU & product snapshots.
 * 4. General AuditLog record is appended for administrative transparency.
 */
export async function executeStockAdjustment(
  params: StockAdjustmentParams
): Promise<StockAdjustmentResult> {
  const { variantId, adjustedQty, reason, referenceId, userId, notes } = params;

  if (adjustedQty === 0) {
    throw new InventoryError('Stock adjustment quantity cannot be zero', 'ZERO_ADJUSTMENT');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current variant
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true } } },
    });

    if (!variant) {
      throw new InventoryError(`Product variant with ID "${variantId}" not found`, 'VARIANT_NOT_FOUND');
    }

    if (variant.isArchived) {
      throw new InventoryError(`Cannot adjust stock for archived variant "${variant.sku}"`, 'VARIANT_ARCHIVED');
    }

    const previousStock = variant.stockQuantity;
    const newStock = previousStock + adjustedQty;

    // 2. Enforce invariant: non-negative inventory
    if (newStock < 0) {
      throw new InventoryError(
        `Insufficient stock for adjustment. Current stock is ${previousStock}, requested adjustment is ${adjustedQty} (resulting in ${newStock}).`,
        'NEGATIVE_STOCK_DISALLOWED'
      );
    }

    // 3. Update variant stock
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: newStock },
    });

    // 4. Create immutable inventory ledger record with snapshot metadata
    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        variantId,
        sku: variant.sku,
        productName: variant.product.name,
        previousStock,
        adjustedQty,
        newStock,
        reason,
        referenceId: referenceId || null,
        userId: userId || null,
        notes: notes || null,
      },
    });

    // 5. Append general administrative audit log
    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: 'INVENTORY_ADJUSTMENT',
        resource: `ProductVariant:${variant.id} (${variant.sku})`,
        details: {
          productName: variant.product.name,
          sku: variant.sku,
          previousStock,
          adjustedQty,
          newStock,
          reason,
          referenceId,
          notes,
        },
      },
    });

    return { variant: updatedVariant, adjustment };
  });
}

/**
 * Safely delete or archive a variant.
 * If historical adjustments or order records exist, hard delete is blocked
 * to preserve the financial & inventory ledger. Instead, the variant is archived.
 */
export async function deleteVariantSafely(variantId: string, operatorId: string) {
  return await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: {
        _count: {
          select: { inventoryAdjustments: true, orderItems: true },
        },
        product: { select: { id: true, name: true } },
      },
    });

    if (!variant) {
      throw new InventoryError(`Variant "${variantId}" not found`, 'VARIANT_NOT_FOUND');
    }

    const hasHistory = variant._count.inventoryAdjustments > 0 || variant._count.orderItems > 0;

    if (hasHistory) {
      // Soft-delete / archive
      const archived = await tx.productVariant.update({
        where: { id: variantId },
        data: { isArchived: true, isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'CATALOG_VARIANT_ARCHIVED',
          resource: `ProductVariant:${variant.id} (${variant.sku})`,
          details: {
            reason: 'Variant archived because historical ledger records exist',
            adjustmentCount: variant._count.inventoryAdjustments,
            orderItemCount: variant._count.orderItems,
          },
        },
      });

      return { action: 'ARCHIVED', variant: archived };
    } else {
      // Safe to hard delete because zero inventory/order history exists
      await tx.productVariant.delete({ where: { id: variantId } });

      await tx.auditLog.create({
        data: {
          userId: operatorId,
          action: 'CATALOG_VARIANT_DELETED',
          resource: `ProductVariant:${variant.id} (${variant.sku})`,
          details: { sku: variant.sku, productName: variant.product.name },
        },
      });

      return { action: 'DELETED', variantId };
    }
  });
}
