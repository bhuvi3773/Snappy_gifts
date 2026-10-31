import crypto from 'node:crypto';
import {
  PaymentAdapter,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  WebhookVerificationResult,
  PaymentDetails,
  PaymentGatewayError,
} from '@/services/adapters/payment.adapter';

export const MOCK_PAYMENT_SECRET = 'snappy_gifts_mock_payment_secret_for_tests_only';
export const MOCK_WEBHOOK_SECRET = 'snappy_gifts_mock_webhook_secret_for_tests_only';
export const MOCK_KEY_ID = 'rzp_mock_snappy_key_id';

/**
 * Deterministically generates a cryptographic HMAC-SHA256 mock signature
 * for unit tests and local simulation.
 */
export function generateMockCallbackSignature(
  gatewayOrderId: string,
  gatewayPaymentId: string,
  secret: string = MOCK_PAYMENT_SECRET
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${gatewayOrderId}|${gatewayPaymentId}`)
    .digest('hex');
}

/**
 * Deterministically generates a cryptographic HMAC-SHA256 mock webhook signature
 * for unit tests and local simulation.
 */
export function generateMockWebhookSignature(
  rawBody: string | Buffer,
  secret: string = MOCK_WEBHOOK_SECRET
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');
}

/**
 * Mock Payment Adapter for automated tests and sandbox verification.
 * Strictly forbidden in production.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private mockStatuses = new Map<string, PaymentDetails>();
  private mockFailures = new Set<string>();

  constructor(
    keyId: string = MOCK_KEY_ID,
    keySecret: string = MOCK_PAYMENT_SECRET,
    webhookSecret: string = MOCK_WEBHOOK_SECRET
  ) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  setMockPaymentStatus(paymentId: string, details: PaymentDetails) {
    this.mockStatuses.set(paymentId.trim(), details);
  }

  setMockPaymentLookupFailure(paymentId: string) {
    this.mockFailures.add(paymentId.trim());
  }

  clearMockOverrides() {
    this.mockStatuses.clear();
    this.mockFailures.clear();
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const gatewayOrderId = `order_mock_${input.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}_${randomSuffix}`;

    return {
      gatewayOrderId,
      amountPaise: input.amountPaise,
      currency: input.currency || 'INR',
      gatewayKeyId: this.keyId,
    };
  }

  async verifyPaymentSignature(input: VerifyPaymentInput): Promise<boolean> {
    if (!input.gatewayOrderId || !input.gatewayPaymentId || !input.gatewaySignature) {
      return false;
    }

    const payload = `${input.gatewayOrderId}|${input.gatewayPaymentId}`;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    if (expected.length !== input.gatewaySignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(input.gatewaySignature, 'utf8')
    );
  }

  async verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string
  ): Promise<WebhookVerificationResult> {
    if (!rawBody || !signature) {
      return { isValid: false, eventType: 'unknown', error: 'Missing raw body or signature.' };
    }

    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(bodyStr)
      .digest('hex');

    if (expected.length !== signature.length) {
      return { isValid: false, eventType: 'unknown', error: 'Signature length mismatch.' };
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    if (!isMatch) {
      return { isValid: false, eventType: 'unknown', error: 'Cryptographic signature mismatch.' };
    }

    try {
      const payload = JSON.parse(bodyStr);
      const eventType = payload.event || 'unknown';
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;

      return {
        isValid: true,
        eventType,
        eventId: payload.event_id || `evt_${Date.now()}`,
        gatewayOrderId: paymentEntity?.order_id || orderEntity?.id,
        gatewayPaymentId: paymentEntity?.id,
        amountPaise: paymentEntity?.amount || orderEntity?.amount,
        currency: paymentEntity?.currency || orderEntity?.currency || 'INR',
        rawPayload: payload,
      };
    } catch {
      return { isValid: false, eventType: 'unknown', error: 'Invalid JSON payload.' };
    }
  }

  async fetchPaymentStatus(gatewayPaymentId: string): Promise<PaymentDetails | null> {
    const cleanId = gatewayPaymentId.trim();
    if (this.mockFailures.has(cleanId)) {
      throw new PaymentGatewayError('Simulated network failure connecting to Razorpay payment status API.');
    }

    if (this.mockStatuses.has(cleanId)) {
      return this.mockStatuses.get(cleanId)!;
    }

    // Default mock response: returns captured to maintain backward compatibility for default test flows
    return {
      status: 'captured',
      amountPaise: 153282,
      currency: 'INR',
      captured: true,
    };
  }
}

