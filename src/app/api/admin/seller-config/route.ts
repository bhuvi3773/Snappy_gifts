import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  getSellerConfig,
  updateSellerConfig,
  SellerConfigError,
} from '@/lib/invoices/seller-config.service';

/**
 * GET /api/admin/seller-config
 * Retrieves the currently configured legal seller information and invoice series settings.
 */
export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const config = await getSellerConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve seller configuration.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seller-config
 * Updates the legal seller identity, GSTIN, registered address, and invoice series settings.
 * Strictly restricted to ADMIN role.
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireRole([Role.ADMIN], req);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const updated = await updateSellerConfig(body, user.email);
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Seller and tax invoice configuration successfully updated.',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof SellerConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update seller configuration.' },
      { status: 500 }
    );
  }
}
