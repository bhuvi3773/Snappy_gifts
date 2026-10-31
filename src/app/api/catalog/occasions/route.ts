import { NextResponse } from 'next/server';
import { getPublicOccasions, CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET() {
  try {
    const occasions = await getPublicOccasions();
    return NextResponse.json({ success: true, data: occasions });
  } catch (error: any) {
    const status = error instanceof CatalogDatabaseError ? 503 : 500;
    return NextResponse.json(
      { error: 'Occasions service is temporarily unavailable' },
      { status }
    );
  }
}
