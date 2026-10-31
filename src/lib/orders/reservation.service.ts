import { prisma } from '@/lib/prisma';
import { isStorefrontFallbackAllowed, CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export interface ReleaseReservationsResult {
  releasedOrdersCount: number;
  releasedOrderNumbers: string[];
}

/**
 * Release stock for orders whose 15-minute reservation window has expired without payment.
 * Idempotent: Can be safely called by background workers or cron schedules.
 */
export async function releaseExpiredReservations(): Promise<ReleaseReservationsResult> {
  const now = new Date();
  const releasedOrderNumbers: string[] = [];

  try {
    // Find all pending unpaid orders whose reservation window has expired
    const expiredOrders = await prisma.order.findMany({
      where: {
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        reservationExpiresAt: {
          lt: now,
        },
      },
      include: {
        items: true,
      },
    });

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // 1. Atomically transition order status to CANCELLED only if still PENDING
        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            orderStatus: 'PENDING',
            paymentStatus: 'PENDING',
          },
          data: {
            orderStatus: 'CANCELLED',
          },
        });

        // Concurrency guard: if another concurrent worker already released this order, skip to prevent double stock return
        if (updateResult.count === 0) {
          return;
        }

        // 2. Restore stock for each variant and log in audit ledger
        for (const item of order.items) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });

            if (variant) {
              const previousStock = variant.stockQuantity;
              const newStock = previousStock + item.quantity;

              // Restore variant stock balance
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stockQuantity: { increment: item.quantity },
                },
              });

              // Immutable audit ledger entry
              await tx.inventoryAdjustment.create({
                data: {
                  variantId: item.variantId,
                  sku: item.sku,
                  productName: item.productName,
                  previousStock,
                  adjustedQty: item.quantity,
                  newStock,
                  reason: 'RESERVATION_EXPIRED',
                  referenceId: order.orderNumber,
                  notes: `Stock returned: 15-minute reservation expired for order ${order.orderNumber}`,
                },
              });
            }
          }
        }

        // 3. Record status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'PENDING',
            toStatus: 'CANCELLED',
            changedBy: 'SYSTEM_EXPIRATION_WORKER',
            notes: '15-minute stock hold expired without verified payment',
          },
        });
      });

      releasedOrderNumbers.push(order.orderNumber);
    }

    return {
      releasedOrdersCount: releasedOrderNumbers.length,
      releasedOrderNumbers,
    };
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production' || !isStorefrontFallbackAllowed()) {
      throw new CatalogDatabaseError('Failed to release expired reservations: Database unreachable.');
    }
    return {
      releasedOrdersCount: 0,
      releasedOrderNumbers: [],
    };
  }
}
