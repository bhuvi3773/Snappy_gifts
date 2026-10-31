import { NextResponse } from 'next/server';
import { calculateCartPricing, PricingValidationError } from '@/lib/pricing/pricing.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, destinationStateCode } = body;

    const quote = await calculateCartPricing(items, destinationStateCode);

    return NextResponse.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    if (error instanceof PricingValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json(
        { error: 'Authoritative pricing service is temporarily unavailable' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to calculate cart pricing' },
      { status: 500 }
    );
  }
}
