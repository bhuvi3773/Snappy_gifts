import { NextResponse } from 'next/server';
import { checkPincodeServiceability } from '@/lib/shipping/pincode.service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get('pincode') || '';

  const result = checkPincodeServiceability(pincode);

  return NextResponse.json({
    success: result.valid,
    data: result,
  });
}
