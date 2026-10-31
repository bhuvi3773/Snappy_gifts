import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { generateInventoryReport } from '@/lib/admin/admin.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const isExport = searchParams.get('export') === 'csv';

    const result = await generateInventoryReport(isExport);

    if (isExport) {
      return new NextResponse(result, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-report-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to generate inventory report.' }, { status: 500 });
  }
}
