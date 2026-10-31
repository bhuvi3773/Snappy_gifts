import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  listCorporateRFQs,
  serializeBigInts,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;
    const orgId = searchParams.get('organizationId') || undefined;

    const rfqs = await listCorporateRFQs(orgId, true, status || undefined);
    return NextResponse.json({ success: true, data: serializeBigInts(rfqs) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list RFQs.' }, { status: 500 });
  }
}
