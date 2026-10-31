import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  getCorporateRFQ,
  serializeBigInts,
  CorporatePermissionError,
  CorporateNotFoundError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rfqId } = await params;
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const rfq = await getCorporateRFQ(rfqId, account.id, false);
    return NextResponse.json({ success: true, data: serializeBigInts(rfq) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporatePermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch RFQ details.' }, { status: 500 });
  }
}
