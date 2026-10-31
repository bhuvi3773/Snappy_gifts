import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  recordOrderDispatch,
  OrderFulfillmentError,
  OrderTransitionError,
  OrderNotFoundError,
} from '@/lib/orders/order-lifecycle.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const body = await req.json();

    // Guard: Prevent paymentStatus modification
    if ('paymentStatus' in body || 'payment_status' in body) {
      return NextResponse.json(
        {
          error: 'Payment status cannot be modified via dispatch endpoint.',
          code: 'PAYMENT_STATE_IMMUTABLE',
        },
        { status: 400 }
      );
    }

    const { carrierPartner, awbNumber, trackingUrl, dispatchedAt, notes, invoicePhysicalSignatureConfirmed } = body;

    const actor = user.name || user.email || 'STAFF';
    const updated = await recordOrderDispatch(
      id,
      {
        carrierPartner,
        awbNumber,
        trackingUrl,
        dispatchedAt,
        notes,
        invoicePhysicalSignatureConfirmed: Boolean(invoicePhysicalSignatureConfirmed),
      },
      actor
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Order successfully marked as dispatched with courier ${carrierPartner} (AWB: ${awbNumber}).`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof OrderFulfillmentError) {
      return NextResponse.json({ error: error.message, code: 'FULFILLMENT_VALIDATION_ERROR' }, { status: 400 });
    }
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message, code: 'INVALID_TRANSITION' }, { status: 422 });
    }
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to record order dispatch.' },
      { status: 500 }
    );
  }
}
