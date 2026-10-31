import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  reviewOrderProof,
  PersonalizationValidationError,
} from '@/lib/personalization/personalization.service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const staffUser = await requireRole([Role.ADMIN, Role.STAFF], req);
    const { orderItemId } = await params;
    const body = await req.json();

    const { status, notes } = body;
    if (!status || (status !== 'ARTWORK_VERIFIED_BY_STAFF' && status !== 'REJECTED_FOR_REWORK')) {
      return NextResponse.json(
        { error: 'Status must be either ARTWORK_VERIFIED_BY_STAFF or REJECTED_FOR_REWORK.' },
        { status: 400 }
      );
    }

    const updated = await reviewOrderProof(
      orderItemId,
      status,
      staffUser.email || staffUser.name || 'STAFF',
      notes
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Proof status updated to ${status} by staff.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof PersonalizationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to review artwork proof.' },
      { status: 500 }
    );
  }
}
