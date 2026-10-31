import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  updateCorporateMemberRole,
  removeCorporateMember,
  CorporateValidationError,
  CorporatePermissionError,
  CorporateNotFoundError,
} from '@/lib/corporate/corporate.service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const body = await req.json();
    const { role } = body;

    const updated = await updateCorporateMemberRole(account.id, user.id, targetUserId, role);
    return NextResponse.json({ success: true, data: updated });
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
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update member role.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    await removeCorporateMember(account.id, user.id, targetUserId);
    return NextResponse.json({ success: true, message: 'Member removed successfully.' });
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
    return NextResponse.json({ error: error.message || 'Failed to remove member.' }, { status: 500 });
  }
}
