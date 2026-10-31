import { NextResponse } from 'next/server';
import { processRazorpayWebhook } from '@/lib/payments/payment.service';
import { InvalidPaymentSignatureError } from '@/services/adapters/payment.adapter';

export async function POST(req: Request) {
  try {
    // 1. Read exact raw request body
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const eventIdHeader = req.headers.get('x-razorpay-event-id');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header.' },
        { status: 400 }
      );
    }

    if (!rawBody || rawBody.length === 0) {
      return NextResponse.json(
        { error: 'Webhook payload cannot be empty.' },
        { status: 400 }
      );
    }

    // 2. Process webhook event idempotently with signature verification
    const result = await processRazorpayWebhook(rawBody, signature, eventIdHeader);

    return NextResponse.json({
      received: true,
      event: result.event,
      status: result.status,
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof InvalidPaymentSignatureError) {
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    console.error('[RAZORPAY_WEBHOOK_ERROR]', error.message);
    return NextResponse.json(
      { error: 'Webhook processing error.' },
      { status: 500 }
    );
  }
}
