import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  getAdminOrderDetails,
  OrderNotFoundError,
} from '@/lib/orders/order-lifecycle.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { id } = await params;
    const order = await getAdminOrderDetails(id);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve order details.' },
      { status: 500 }
    );
  }
}
