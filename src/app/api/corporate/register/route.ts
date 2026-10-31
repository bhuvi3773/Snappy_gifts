import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  registerCorporateAccount,
  serializeBigInts,
  CorporateValidationError,
} from '@/lib/corporate/corporate.service';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const account = await registerCorporateAccount(
      user.id,
      user.email,
      user.name || 'Corporate Owner',
      body
    );

    return NextResponse.json(
      { success: true, message: 'Corporate application submitted for review.', data: serializeBigInts(account) },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Corporate registration failed.' }, { status: 500 });
  }
}
