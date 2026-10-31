import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  listCorporateQuotes,
  serializeBigInts,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;

    const quotes = await listCorporateQuotes(account.id, false, status || undefined);
    return NextResponse.json({ success: true, data: serializeBigInts(quotes) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list quotations.' }, { status: 500 });
  }
}
