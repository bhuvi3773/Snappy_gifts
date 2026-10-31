import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  reviewCorporateAccount,
  getCorporateAccount,
  serializeBigInts,
  CorporateValidationError,
  CorporateNotFoundError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orgId } = await params;
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const account = await getCorporateAccount(orgId);
    return NextResponse.json({ success: true, data: serializeBigInts(account) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch account.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orgId } = await params;
    // Account approval/suspension requires ADMIN privileges
    const adminUser = await requireRole([Role.ADMIN], req);

    const body = await req.json();
    const { action, reason } = body;

    const updated = await reviewCorporateAccount(orgId, adminUser.id, action, reason);
    return NextResponse.json({
      success: true,
      message: `Corporate account has been ${action}d.`,
      data: serializeBigInts(updated),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to review corporate account.' }, { status: 500 });
  }
}
