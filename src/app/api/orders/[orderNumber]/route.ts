import { NextResponse } from 'next/server';
import { getOptionalUser } from '@/lib/auth/rbac';
import {
  getOrderForUser,
  lookupGuestOrder,
  OrderAuthorizationError,
  OrderNotFoundError,
} from '@/lib/orders/order-lookup.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const { searchParams } = new URL(req.url);
    const contact = searchParams.get('contact');
    const token = searchParams.get('token');

    // 1. Check if authenticated
    const user = await getOptionalUser(req);
    if (user) {
      try {
        const order = await getOrderForUser(orderNumber, user.id, user.role);
        return NextResponse.json({ success: true, data: order });
      } catch (authErr) {
        if (authErr instanceof OrderAuthorizationError) {
          return NextResponse.json({ error: authErr.message }, { status: 403 });
        }
        throw authErr;
      }
    }

    // 2. Guest lookup requires contact (email or phone)
    if (contact) {
      const order = await lookupGuestOrder(orderNumber, contact);
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json(
      { error: 'Please log in or provide your matching email/phone to view this order.' },
      { status: 401 }
    );
  } catch (error: any) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json(
        { error: 'Order service is temporarily unavailable.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to retrieve order details.' },
      { status: 500 }
    );
  }
}
