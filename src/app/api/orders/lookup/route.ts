import { NextResponse } from 'next/server';
import { lookupGuestOrder, OrderNotFoundError } from '@/lib/orders/order-lookup.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNumber, contact } = body;

    const forwarded = req.headers.get('x-forwarded-for') || 'unknown';
    const clientIp = forwarded.split(',')[0].trim();

    const order = await lookupGuestOrder(orderNumber, contact, clientIp);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes('Too many order lookup attempts')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json(
        { error: 'Order lookup service is temporarily unavailable.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to look up order.' },
      { status: 500 }
    );
  }
}
