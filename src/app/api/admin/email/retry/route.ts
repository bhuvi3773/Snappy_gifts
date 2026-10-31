import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { retryFailedEmail } from '@/lib/email/email-outbox.service';

/**
 * POST /api/admin/email/retry
 * Resets a failed outbox message to PENDING for immediate redelivery.
 */
export async function POST(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { outboxId } = body;
    if (!outboxId || typeof outboxId !== 'string') {
      return NextResponse.json({ error: 'outboxId is required.' }, { status: 400 });
    }

    const success = await retryFailedEmail(outboxId);
    if (!success) {
      return NextResponse.json({ error: 'Outbox message not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email successfully queued for retry.',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to retry email.' },
      { status: 500 }
    );
  }
}
