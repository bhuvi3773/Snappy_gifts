import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { getOutboxMessages } from '@/lib/email/email-outbox.service';

/**
 * GET /api/admin/email/outbox
 * Retrieves transactional email outbox status and messages for admin inspection.
 */
export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const orderNumber = searchParams.get('orderNumber') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const messages = await getOutboxMessages({ status, orderNumber, limit });
    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve email outbox.' },
      { status: 500 }
    );
  }
}
