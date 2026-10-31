import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { getPaymentReconciliations } from '@/lib/payments/payment.service';

export async function GET(req: Request) {
  try {
    // Requires ADMIN or STAFF authorization
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'OPEN';

    const records = await getPaymentReconciliations(status);

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    if (error.message?.includes('Access denied') || error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment reconciliations.' },
      { status: 500 }
    );
  }
}
