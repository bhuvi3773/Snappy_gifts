import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { releaseExpiredReservations } from '@/lib/orders/reservation.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function POST(req: Request) {
  try {
    // Support either scheduled cron workers (via Authorization: Bearer <CRON_SECRET>)
    // or interactive session authorization (ADMIN / STAFF)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_WORKER_SECRET;
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isCronAuthorized) {
      await requireRole([Role.ADMIN, Role.STAFF], req);
    }

    const result = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      message: `Released ${result.releasedOrdersCount} expired reservation(s).`,
      data: result,
    });
  } catch (error: any) {
    if (error.message?.includes('Authentication required') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json(
        { error: 'Database unreachable during reservation release.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to release expired reservations.' },
      { status: 500 }
    );
  }
}
