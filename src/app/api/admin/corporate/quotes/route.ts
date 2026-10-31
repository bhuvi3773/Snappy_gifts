import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  listCorporateQuotes,
  createCorporateQuote,
  serializeBigInts,
  CorporateValidationError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId') || undefined;
    const status = searchParams.get('status') as any;

    const quotes = await listCorporateQuotes(orgId, true, status || undefined);
    return NextResponse.json({ success: true, data: serializeBigInts(quotes) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list quotations.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole([Role.ADMIN, Role.STAFF], req);
    const body = await req.json();

    const quote = await createCorporateQuote(body, adminUser.id);
    return NextResponse.json(
      {
        success: true,
        message: 'Quotation created successfully.',
        data: serializeBigInts(quote),
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
    return NextResponse.json({ error: error.message || 'Failed to create quotation.' }, { status: 500 });
  }
}
