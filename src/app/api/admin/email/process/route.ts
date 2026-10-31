import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { processEmailOutbox } from '@/lib/email/email-outbox.service';

/**
 * POST /api/admin/email/process
 * Concurrency-safe worker execution endpoint.
 * Dispatches queued outbox messages with exponential backoff handling.
 * Can be invoked by external scheduler, CRON, or manual admin action.
 */
export async function POST(req: Request) {
  try {
    // Support either scheduled cron workers (via Authorization: Bearer <CRON_SECRET>)
    // or interactive session authorization (ADMIN / STAFF)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_WORKER_SECRET;
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    let workerId: string;
    if (isCronAuthorized) {
      workerId = `cron-worker-${Date.now()}`;
    } else {
      const user = await requireRole([Role.ADMIN, Role.STAFF], req);
      workerId = `manual-admin-${user.id}-${Date.now()}`;
    }

    const result = await processEmailOutbox({ batchSize: 20, workerId });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Processed ${result.processedCount} messages (${result.sentCount} sent, ${result.failedCount} failed).`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to process email outbox.' },
      { status: 500 }
    );
  }
}
