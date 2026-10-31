import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  addCorporateMember,
  serializeBigInts,
  CorporateValidationError,
  CorporatePermissionError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInts(account.memberships || []),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list members.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const body = await req.json();
    const { targetUserId, targetEmail, targetName, role } = body;

    const newMember = await addCorporateMember(
      account.id,
      user.id,
      targetUserId || `usr_${Date.now()}`,
      targetEmail,
      targetName || targetEmail.split('@')[0],
      role
    );

    return NextResponse.json({ success: true, data: serializeBigInts(newMember) }, { status: 201 });
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
    return NextResponse.json({ error: error.message || 'Failed to add member.' }, { status: 500 });
  }
}
