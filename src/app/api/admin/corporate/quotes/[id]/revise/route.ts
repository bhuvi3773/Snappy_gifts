import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  reviseCorporateQuote,
  serializeBigInts,
  CorporateValidationError,
  CorporateNotFoundError,
} from '@/lib/corporate/corporate.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quoteId } = await params;
    const adminUser = await requireRole([Role.ADMIN, Role.STAFF], req);
    const body = await req.json();

    const newRevision = await reviseCorporateQuote(quoteId, body, adminUser.id);
    return NextResponse.json(
      {
        success: true,
        message: `Quotation revised. New active revision: Rev ${newRevision.revision}.`,
        data: serializeBigInts(newRevision),
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
    if (error instanceof CorporateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to revise quotation.' }, { status: 500 });
  }
}
