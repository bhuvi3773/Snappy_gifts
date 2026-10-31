import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import {
  listPriceAgreements,
  createPriceAgreement,
  serializeBigInts,
  CorporateValidationError,
} from '@/lib/corporate/corporate.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN], req);

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId') || undefined;
    const productId = searchParams.get('productId') || undefined;

    const agreements = await listPriceAgreements(orgId, productId);
    return NextResponse.json({ success: true, data: serializeBigInts(agreements) });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Failed to list price agreements.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Sensitive pricing agreements and corporate financial details must not be available to unauthorized staff.
    const adminUser = await requireRole([Role.ADMIN], req);
    const body = await req.json();

    const agreement = await createPriceAgreement(body, adminUser.id);
    return NextResponse.json(
      {
        success: true,
        message: 'Corporate price agreement created successfully.',
        data: serializeBigInts(agreement),
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
    return NextResponse.json({ error: error.message || 'Failed to create price agreement.' }, { status: 500 });
  }
}
