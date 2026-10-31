import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { generateSalesReport } from '@/lib/admin/admin.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const isExport = searchParams.get('export') === 'csv';

    const result = await generateSalesReport({ from, to }, isExport);

    if (isExport) {
      return new NextResponse(result, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sales-report-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to generate sales report.' }, { status: 500 });
  }
}
