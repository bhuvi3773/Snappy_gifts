import { NextResponse } from 'next/server';
import {
  verifyCallbackPayment,
} from '@/lib/payments/payment.service';
import {
  InvalidPaymentSignatureError,
  PaymentDiscrepancyError,
} from '@/services/adapters/payment.adapter';
import { getOptionalUser } from '@/lib/auth/rbac';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNumber, gatewayOrderId, gatewayPaymentId, gatewaySignature, guestToken } = body;

    if (!orderNumber || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return NextResponse.json(
        { error: 'Missing required Razorpay callback verification parameters.' },
        { status: 400 }
      );
    }

    const user = await getOptionalUser(req);

    const result = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      guestToken,
      userId: user?.id,
      userRole: user?.role,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof InvalidPaymentSignatureError) {
      return NextResponse.json(
        { error: 'Cryptographic signature mismatch. Payment verification failed.' },
        { status: 400 }
      );
    }

    if (error instanceof PaymentDiscrepancyError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.discrepancyType,
          reconciliationRequired: true,
        },
        { status: 409 } // Conflict / Reconciliation required
      );
    }

    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json(
        { error: 'Database service unavailable during payment verification.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Payment verification failed. Please contact support.' },
      { status: 500 }
    );
  }
}
