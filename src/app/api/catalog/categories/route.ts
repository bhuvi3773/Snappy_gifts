import { NextResponse } from 'next/server';
import { getPublicCategories, CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET() {
  try {
    const categories = await getPublicCategories();
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    const status = error instanceof CatalogDatabaseError ? 503 : 500;
    return NextResponse.json(
      { error: 'Categories service is temporarily unavailable' },
      { status }
    );
  }
}
