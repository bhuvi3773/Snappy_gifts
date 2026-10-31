import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  serializeBigInts,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);

    if (!account) {
      return NextResponse.json({ success: true, hasAccount: false, data: null });
    }

    return NextResponse.json({
      success: true,
      hasAccount: true,
      data: serializeBigInts(account),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch corporate profile.' }, { status: 500 });
  }
}
