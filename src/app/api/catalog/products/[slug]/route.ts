import { NextResponse } from 'next/server';
import { getPublicProductBySlug, CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await getPublicProductBySlug(slug);

    if (!product) {
      return NextResponse.json(
        { error: `Product with slug or ID "${slug}" was not found or is currently unavailable.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    const status = error instanceof CatalogDatabaseError ? 503 : 500;
    return NextResponse.json(
      { error: 'Product details are temporarily unavailable' },
      { status }
    );
  }
}
