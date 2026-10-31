import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { getAdminOverviewMetrics } from '@/lib/admin/admin.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const metrics = await getAdminOverviewMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch admin overview metrics.' }, { status: 500 });
  }
}
