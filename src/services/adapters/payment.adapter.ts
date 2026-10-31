/**
 * Payment Provider Adapter Interface
 * All payment implementations (Mock, Razorpay Sandbox, Razorpay Live) must conform to this interface.
 * All amounts are strictly in integer paise.
 */

export interface CreatePaymentOrderInput {
  orderId: string;
  orderNumber: string;
  amountPaise: bigint | number;
  currency: string; // "INR"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  gatewayOrderId: string;
  amountPaise: bigint | number;
  currency: string;
  gatewayKeyId: string;
}

export interface VerifyPaymentInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType: 'payment.captured' | 'payment.failed' | 'payment.authorized' | 'order.paid' | 'unknown';
  eventId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amountPaise?: bigint | number;
  currency?: string;
  error?: string;
  rawPayload?: any;
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigurationError';
  }
}

export class PaymentGatewayError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export class InvalidPaymentSignatureError extends Error {
  constructor(message: string = 'Cryptographic payment signature mismatch.') {
    super(message);
    this.name = 'InvalidPaymentSignatureError';
  }
}

export class PaymentDiscrepancyError extends Error {
  constructor(message: string, public discrepancyType: string) {
    super(message);
    this.name = 'PaymentDiscrepancyError';
  }
}

export interface PaymentDetails {
  status: 'captured' | 'authorized' | 'failed' | 'refunded' | string;
  amountPaise: number;
  currency: string;
  gatewayOrderId?: string;
  captured?: boolean;
}

export interface PaymentAdapter {
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult>;
  verifyPaymentSignature(input: VerifyPaymentInput): Promise<boolean>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): Promise<WebhookVerificationResult>;
  fetchPaymentStatus?(gatewayPaymentId: string): Promise<PaymentDetails | null>;
}

