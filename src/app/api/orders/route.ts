import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import { listOrdersForCustomer } from '@/lib/orders/order-lifecycle.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listOrdersForCustomer(user.id, { page, limit });

    return NextResponse.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve order history.' },
      { status: 500 }
    );
  }
}
