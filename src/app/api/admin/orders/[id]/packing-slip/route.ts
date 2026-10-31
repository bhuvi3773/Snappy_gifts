import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { generatePackingSlip } from '@/lib/invoices/invoice.service';

/**
 * GET /api/admin/orders/[id]/packing-slip
 * 
 * Generates and downloads an authorized warehouse Packing Slip PDF for an order.
 * RBAC: Strictly restricted to ADMIN and STAFF users.
 * Customer access is denied.
 * All prices, order totals, and taxes are strictly omitted from the document.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const result = await generatePackingSlip(id, { requestedBy: user.email });

    const safeFilename = `packing-slip-${result.orderNumber}.pdf`;

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(result.buffer.length),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to generate packing slip.' },
      { status: 500 }
    );
  }
}
