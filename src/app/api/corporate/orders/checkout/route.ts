import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  createCorporateOrderGroup,
  serializeBigInts,
  CorporateValidationError,
  CorporatePermissionError,
} from '@/lib/corporate/corporate.service';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const body = await req.json();
    const groupOrder = await createCorporateOrderGroup(account.id, user.id, body);

    return NextResponse.json(
      {
        success: true,
        message: 'Corporate multi-address order group created successfully.',
        data: serializeBigInts(groupOrder),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CorporatePermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Corporate checkout failed.' }, { status: 500 });
  }
}
