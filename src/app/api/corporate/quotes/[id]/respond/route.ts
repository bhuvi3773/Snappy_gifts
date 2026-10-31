import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  getCorporateAccountForUser,
  respondToCorporateQuote,
  serializeBigInts,
  CorporateValidationError,
  CorporatePermissionError,
  CorporateStateError,
} from '@/lib/corporate/corporate.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quoteId } = await params;
    const user = await requireAuth(req);
    const account = await getCorporateAccountForUser(user.id);
    if (!account) {
      return NextResponse.json({ error: 'No corporate account found.' }, { status: 404 });
    }

    const body = await req.json();
    const { decision, comments } = body;

    if (!['ACCEPT', 'REJECT'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be ACCEPT or REJECT.' },
        { status: 400 }
      );
    }

    const updatedQuote = await respondToCorporateQuote(
      quoteId,
      account.id,
      user.id,
      decision,
      comments
    );

    return NextResponse.json({
      success: true,
      message: `Quotation has been successfully ${decision === 'ACCEPT' ? 'accepted' : 'rejected'}.`,
      data: serializeBigInts(updatedQuote),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporatePermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CorporateStateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to process quotation response.' }, { status: 500 });
  }
}
