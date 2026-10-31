import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  getCorporateRFQ,
  updateCorporateRFQStatus,
  serializeBigInts,
  CorporateValidationError,
  CorporateStateError,
  CorporateNotFoundError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rfqId } = await params;
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const rfq = await getCorporateRFQ(rfqId, undefined, true);
    return NextResponse.json({ success: true, data: serializeBigInts(rfq) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch RFQ.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rfqId } = await params;
    const adminUser = await requireRole([Role.ADMIN, Role.STAFF], req);

    const body = await req.json();
    const { status, internalNotes, customerNotes } = body;

    const updated = await updateCorporateRFQStatus(rfqId, status, adminUser.id, {
      internalNotes,
      customerNotes,
    });

    return NextResponse.json({
      success: true,
      message: `RFQ status updated to ${status}.`,
      data: serializeBigInts(updated),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CorporateStateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update RFQ.' }, { status: 500 });
  }
}
