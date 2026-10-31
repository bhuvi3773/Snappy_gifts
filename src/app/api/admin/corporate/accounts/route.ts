import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  listCorporateAccounts,
  serializeBigInts,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;

    const accounts = await listCorporateAccounts(status || undefined);
    return NextResponse.json({ success: true, data: serializeBigInts(accounts) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list corporate accounts.' }, { status: 500 });
  }
}
