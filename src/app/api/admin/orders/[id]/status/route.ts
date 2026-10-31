import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role, OrderStatus } from '@prisma/client';
import {
  transitionOrderStatus,
  OrderTransitionError,
  OrderNotFoundError,
} from '@/lib/orders/order-lifecycle.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const body = await req.json();

    // Guard: Prevent fulfillment routes from modifying payment status
    if ('paymentStatus' in body || 'payment_status' in body) {
      return NextResponse.json(
        {
          error: 'Payment status cannot be modified via order fulfillment routes. Payment transitions require verified gateway callbacks or payment reconciliation.',
          code: 'PAYMENT_STATE_IMMUTABLE',
        },
        { status: 400 }
      );
    }

    const { status, notes } = body;
    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field "status".' },
        { status: 400 }
      );
    }

    const actor = user.name || user.email || 'STAFF';
    const updated = await transitionOrderStatus(id, status as OrderStatus, actor, notes);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Order status successfully transitioned to ${status}.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
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
      { error: error.message || 'Failed to update order status.' },
      { status: 500 }
    );
  }
}
