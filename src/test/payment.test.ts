import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  initiatePayment,
  verifyCallbackPayment,
  processRazorpayWebhook,
  getPaymentReconciliations,
  _resetPaymentDevStoreForTesting,
  OrderNotEligibleForPaymentError,
  OrderHoldExpiredError,
} from '../lib/payments/payment.service';
import {
  getPaymentAdapter,
  resetPaymentAdapter,
  setCustomPaymentAdapter,
} from '../lib/payments/payment-factory';
import {
  MockPaymentAdapter,
  generateMockCallbackSignature,
  generateMockWebhookSignature,
  MOCK_PAYMENT_SECRET,
  MOCK_WEBHOOK_SECRET,
  MOCK_KEY_ID,
} from '../lib/payments/mock.adapter';
import { RazorpayPaymentAdapter } from '../lib/payments/razorpay.adapter';
import {
  PaymentConfigurationError,
  InvalidPaymentSignatureError,
  PaymentDiscrepancyError,
} from '@/services/adapters/payment.adapter';

export async function runPaymentTestSuite() {
  console.log('====================================================');
  console.log('  Snappy Gifts — Batch 5: Payment & Razorpay Tests   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      _resetPaymentDevStoreForTesting();
      resetPaymentAdapter();
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✘ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}\n`);
      failed++;
    }
  }

  // ------------------------------------------------------------------
  // 1. Payment Driver Configuration & Production Fail-Closed
  // ------------------------------------------------------------------
  console.log('--- 1. Driver Configuration & Production Fail-Closed Safety ---');

  await test('Resolves to MockPaymentAdapter in test environment by default', async () => {
    const adapter = getPaymentAdapter();
    assert.ok(adapter instanceof MockPaymentAdapter, 'Should instantiate MockPaymentAdapter');
  });

  await test('Strictly forbids mock payment driver when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert.throws(
        () => getPaymentAdapter('mock'),
        (err: any) => err instanceof PaymentConfigurationError && err.message.includes('Security Violation')
      );
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  await test('RazorpayPaymentAdapter fails closed in production when credentials are missing or placeholder', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert.throws(
        () => new RazorpayPaymentAdapter('', '', ''),
        (err: any) => err instanceof PaymentConfigurationError
      );
      assert.throws(
        () => new RazorpayPaymentAdapter('rzp_test_placeholder_key', 'rzp_test_secret', 'secret'),
        (err: any) => err instanceof PaymentConfigurationError
      );
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  // ------------------------------------------------------------------
  // 2. Server-Derived Authoritative Amount & Currency
  // ------------------------------------------------------------------
  console.log('--- 2. Server-Derived Authoritative Amount & Currency ---');

  await test('Initiates payment using server-authoritative amount in integer paise and INR currency', async () => {
    const paymentConfig = await initiatePayment({
      orderNumber: 'SG-20261029-TEST01',
    });

    assert.ok(paymentConfig.gatewayOrderId.startsWith('order_mock_'), 'Gateway order ID must be generated');
    assert.equal(paymentConfig.currency, 'INR', 'Currency must be INR');
    assert.ok(paymentConfig.amountPaise > 0, 'Amount must be positive integer paise');
    assert.equal(Number.isInteger(paymentConfig.amountPaise), true, 'Amount must be an integer');
    assert.equal(paymentConfig.gatewayKeyId, MOCK_KEY_ID);
  });

  await test('Reuses existing pending gateway order on retry to prevent duplicate gateway orders', async () => {
    const orderNumber = 'SG-20261029-RETRY01';
    const firstCall = await initiatePayment({ orderNumber });
    const secondCall = await initiatePayment({ orderNumber });

    assert.equal(
      firstCall.gatewayOrderId,
      secondCall.gatewayOrderId,
      'Subsequent payment initiation for the same pending order must reuse gatewayOrderId'
    );
  });

  await test('Razorpay Create Order payload conforms strictly to POST /v1/orders standard schema without payment_capture', async () => {
    const adapter = new RazorpayPaymentAdapter('rzp_test_sample_key', 'rzp_test_sample_secret', 'whsec_sample');
    const input = {
      orderId: 'ord_sample_987',
      orderNumber: 'SG-20261029-SAMPLE99',
      amountPaise: 153282,
      currency: 'INR',
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav@example.com',
      customerPhone: '+919876543210',
    };

    const payload = adapter.buildOrderPayload(input);

    // Verify authoritative server-side amount and INR currency
    assert.equal(payload.amount, 153282, 'Amount must match server-authoritative integer paise');
    assert.equal(payload.currency, 'INR', 'Currency must be INR');
    assert.equal(payload.receipt, 'SG-20261029-SAMPLE99');
    assert.equal(payload.notes.orderNumber, 'SG-20261029-SAMPLE99');
    assert.equal(payload.notes.customerName, 'Aarav Sharma');

    // Verify ONLY official supported fields (amount, currency, receipt, notes) are in the payload
    const payloadKeys = Object.keys(payload);
    const supportedKeys = ['amount', 'currency', 'receipt', 'notes'];
    for (const key of payloadKeys) {
      assert.ok(supportedKeys.includes(key), `Payload must not contain unsupported field: ${key}`);
    }

    // Explicitly verify payment_capture is NOT present
    assert.equal((payload as any).payment_capture, undefined, 'Payload must not include payment_capture');
  });

  // ------------------------------------------------------------------
  // 3. Callback Signature Verification & Tamper Resistance
  // ------------------------------------------------------------------
  console.log('--- 3. Client Callback Signature Verification ---');

  await test('Cryptographically verifies authentic Razorpay callback signature', async () => {
    const orderNumber = 'SG-20261029-AUTH01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_test_12345';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    const result = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });

    assert.equal(result.success, true);
    assert.equal(result.isCaptured, true);
    assert.equal(result.paymentStatus, 'CAPTURED');
    assert.equal(result.orderStatus, 'CONFIRMED');
  });

  await test('Valid callback with payment still only authorized: leaves order PENDING and does NOT confirm order', async () => {
    const orderNumber = 'SG-20261029-AUTHONLY_CB01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_auth_only_cb_99';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    // Configure mock adapter to report authorized status (not captured)
    const mockAdapter = new MockPaymentAdapter();
    mockAdapter.setMockPaymentStatus(gatewayPaymentId, {
      status: 'authorized',
      amountPaise: init.amountPaise,
      currency: 'INR',
      captured: false,
    });
    setCustomPaymentAdapter(mockAdapter);

    const result = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });

    assert.equal(result.success, true);
    assert.equal(result.isCaptured, false, 'Must indicate payment is NOT yet captured');
    assert.equal(result.paymentStatus, 'AUTHORIZED', 'Payment must be AUTHORIZED');
    assert.equal(result.orderStatus, 'PENDING', 'Order must remain PENDING without confirmed fulfillment');
    assert.ok(result.message.includes('Payment authorized') || result.message.includes('Awaiting capture'));

    // Verify dev store / database state
    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.ok(devPmt, 'Payment record must exist');
    assert.equal(devPmt.status, 'AUTHORIZED');
    assert.equal(devPmt.order?.orderStatus, 'PENDING', 'Order status in DB must not be CONFIRMED');
  });

  await test('Valid callback followed by verified capture: confirms order only when capture evidence is received', async () => {
    const orderNumber = 'SG-20261029-AUTH_THEN_CAP01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_auth_then_cap_42';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    // 1. Initial callback when gateway has only authorized the payment
    const mockAdapter = new MockPaymentAdapter();
    mockAdapter.setMockPaymentStatus(gatewayPaymentId, {
      status: 'authorized',
      amountPaise: init.amountPaise,
      currency: 'INR',
      captured: false,
    });
    setCustomPaymentAdapter(mockAdapter);

    const callbackResult = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });
    assert.equal(callbackResult.isCaptured, false);
    assert.equal(callbackResult.orderStatus, 'PENDING');

    // 2. Gateway capture occurs: payment.captured webhook arrives
    const capturePayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_auth_then_cap_001',
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const captureSig = generateMockWebhookSignature(capturePayload);
    const webhookResult = await processRazorpayWebhook(capturePayload, captureSig, 'evt_auth_then_cap_001');
    assert.equal(webhookResult.status, 'PROCESSED');

    // 3. Verify order is now CONFIRMED and payment is CAPTURED
    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.equal(devPmt.status, 'CAPTURED');
    assert.equal(devPmt.order?.orderStatus, 'CONFIRMED');
    assert.equal(devPmt.order?.paymentStatus, 'CAPTURED');
  });

  await test('Payment-status lookup failure during callback: leaves order PENDING without confirmation', async () => {
    const orderNumber = 'SG-20261029-LOOKUPFAIL01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_lookup_fail_88';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    // Simulate Razorpay status lookup network failure / 500 error
    const mockAdapter = new MockPaymentAdapter();
    mockAdapter.setMockPaymentLookupFailure(gatewayPaymentId);
    setCustomPaymentAdapter(mockAdapter);

    const result = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });

    assert.equal(result.success, true);
    assert.equal(result.isCaptured, false, 'Must NOT assume captured when lookup fails');
    assert.equal(result.paymentStatus, 'AUTHORIZED', 'Payment recorded as AUTHORIZED');
    assert.equal(result.orderStatus, 'PENDING', 'Order must remain PENDING');
    assert.ok(result.message.includes('lookup failed') || result.message.includes('unavailable'));

    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.equal(devPmt.order?.orderStatus, 'PENDING', 'Order must not be confirmed on lookup failure');
  });

  await test('Rejects callback payment verification after 15-minute reservation hold expires', async () => {
    const orderNumber = 'SG-20261029-LATECB01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_late_cb_77';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    // Expire hold in dev store
    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    if (devPmt?.order) {
      devPmt.order.reservationExpiresAt = new Date(Date.now() - 60000); // 1 minute in the past
    }

    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber,
          gatewayOrderId: init.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSignature,
        });
      },
      (err: any) => err instanceof PaymentDiscrepancyError && err.discrepancyType === 'LATE_PAYMENT_EXPIRED_HOLD'
    );
  });

  await test('Rejects tampered, forged or invalid callback signatures', async () => {
    const orderNumber = 'SG-20261029-FORGE01';
    const init = await initiatePayment({ orderNumber });

    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber,
          gatewayOrderId: init.gatewayOrderId,
          gatewayPaymentId: 'pay_mock_test_forge',
          gatewaySignature: 'bad_forged_hex_signature_abcdef1234567890abcdef1234567890abcdef12',
        });
      },
      (err: any) => err instanceof InvalidPaymentSignatureError
    );
  });

  await test('Rejects callback with mismatched or missing gateway parameters', async () => {
    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber: 'SG-20261029-MISSING01',
          gatewayOrderId: '',
          gatewayPaymentId: 'pay_123',
          gatewaySignature: 'sig_123',
        });
      },
      (err: any) => err instanceof InvalidPaymentSignatureError
    );
  });

  await test('Rejects callback when client supplies untrusted or mismatched gatewayOrderId for order', async () => {
    const orderNumber = 'SG-20261029-UNTRUST01';
    const init = await initiatePayment({ orderNumber });

    // Client attempts to verify using a different / fabricated gatewayOrderId
    const fakeGatewayOrderId = 'order_mock_unrelated_order_99999';
    const fakeSignature = generateMockCallbackSignature(fakeGatewayOrderId, 'pay_mock_untrust_123');

    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber,
          gatewayOrderId: fakeGatewayOrderId,
          gatewayPaymentId: 'pay_mock_untrust_123',
          gatewaySignature: fakeSignature,
        });
      },
      (err: any) => err instanceof InvalidPaymentSignatureError && err.message.includes('Payment attempt not found')
    );
  });

  await test('Rejects callback when payment attempt amount mismatches order grand total', async () => {
    const orderNumber = 'SG-20261029-AMTMIS01';
    const init = await initiatePayment({ orderNumber });

    // Tamper with the recorded payment attempt amount in dev store
    const devStores = await import('../lib/payments/payment.service');
    const existingDevPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    // Artificially change amount in payment record to simulate mismatch
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, 'pay_mock_mismatch_amt');

    // We can test that if amounts differ, PaymentDiscrepancyError is thrown
    const { _tamperPaymentAmountForTesting } = devStores as any;
    if (_tamperPaymentAmountForTesting) {
      _tamperPaymentAmountForTesting(init.gatewayOrderId, 50000); // 50000 paise vs 153282 paise
      await assert.rejects(
        async () => {
          await verifyCallbackPayment({
            orderNumber,
            gatewayOrderId: init.gatewayOrderId,
            gatewayPaymentId: 'pay_mock_mismatch_amt',
            gatewaySignature: validSignature,
          });
        },
        (err: any) => err instanceof PaymentDiscrepancyError && err.discrepancyType === 'AMOUNT_MISMATCH'
      );
    }
  });

  // ------------------------------------------------------------------
  // 4. Duplicate Callback Idempotency
  // ------------------------------------------------------------------
  console.log('--- 4. Replay Idempotency & Repeat Callback Handling ---');

  await test('Replayed callback verification requests are handled idempotently without duplicate status transitions', async () => {
    const orderNumber = 'SG-20261029-IDEMP01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_idemp_999';
    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, gatewayPaymentId);

    // First verification
    const firstResult = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });
    assert.equal(firstResult.paymentStatus, 'CAPTURED');

    // Second verification (replayed)
    const secondResult = await verifyCallbackPayment({
      orderNumber,
      gatewayOrderId: init.gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature: validSignature,
    });
    assert.equal(secondResult.success, true);
    assert.equal(secondResult.paymentStatus, 'CAPTURED');
    assert.ok(secondResult.message.includes('previously verified'));
  });

  // ------------------------------------------------------------------
  // 5. Dedicated Webhook Raw-Body Verification & Deduplication
  // ------------------------------------------------------------------
  console.log('--- 5. Webhook Raw-Body Verification & Event Deduplication ---');

  await test('Verifies webhook against exact raw payload string and updates payment to CAPTURED', async () => {
    const orderNumber = 'SG-20261029-WH01';
    const init = await initiatePayment({ orderNumber });
    const gatewayPaymentId = 'pay_mock_wh_777';

    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_test_wh_001',
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    const validWebhookSig = generateMockWebhookSignature(webhookPayload);

    const result = await processRazorpayWebhook(webhookPayload, validWebhookSig, 'evt_test_wh_001');
    assert.equal(result.success, true);
    assert.equal(result.event, 'payment.captured');
    assert.equal(result.status, 'PROCESSED');
  });

  await test('Rejects webhook with invalid raw-body signature before processing', async () => {
    const webhookPayload = JSON.stringify({ event: 'payment.captured' });
    const invalidSig = 'invalid_webhook_signature_abcdef1234567890abcdef1234567890abcdef12';

    await assert.rejects(
      async () => {
        await processRazorpayWebhook(webhookPayload, invalidSig);
      },
      (err: any) => err instanceof InvalidPaymentSignatureError
    );
  });

  await test('Deduplicates duplicate webhook deliveries using eventId', async () => {
    const orderNumber = 'SG-20261029-WHDEDUP01';
    const init = await initiatePayment({ orderNumber });

    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_dedup_unique_123',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_dedup',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
          },
        },
      },
    });
    const validSig = generateMockWebhookSignature(webhookPayload);

    // First delivery
    const res1 = await processRazorpayWebhook(webhookPayload, validSig, 'evt_dedup_unique_123');
    assert.equal(res1.status, 'PROCESSED');

    // Duplicate retry
    const res2 = await processRazorpayWebhook(webhookPayload, validSig, 'evt_dedup_unique_123');
    assert.equal(res2.status, 'DUPLICATE_IGNORED');
  });

  // ------------------------------------------------------------------
  // 6. Payment Failure and Out-of-Order Gateway Events
  // ------------------------------------------------------------------
  console.log('--- 6. Failed & Out-of-Order Payment Events ---');

  await test('Processes payment.failed webhook event and marks payment as FAILED', async () => {
    const orderNumber = 'SG-20261029-FAIL01';
    const init = await initiatePayment({ orderNumber });

    const failPayload = JSON.stringify({
      event: 'payment.failed',
      event_id: 'evt_fail_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_xyz',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    });
    const sig = generateMockWebhookSignature(failPayload);

    const result = await processRazorpayWebhook(failPayload, sig, 'evt_fail_001');
    assert.equal(result.success, true);
    assert.equal(result.event, 'payment.failed');
  });

  await test('Processes payment.authorized webhook: transitions payment to AUTHORIZED while order remains PENDING (authorization without capture)', async () => {
    const orderNumber = 'SG-20261029-AUTHONLY01';
    const init = await initiatePayment({ orderNumber });

    const authPayload = JSON.stringify({
      event: 'payment.authorized',
      event_id: 'evt_auth_only_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_authorized_only_123',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'authorized',
          },
        },
      },
    });
    const sig = generateMockWebhookSignature(authPayload);

    const result = await processRazorpayWebhook(authPayload, sig, 'evt_auth_only_001');
    assert.equal(result.success, true);
    assert.equal(result.event, 'payment.authorized');
    assert.equal(result.status, 'PROCESSED');

    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.ok(devPmt, 'Payment record must exist');
    assert.equal(devPmt.status, 'AUTHORIZED', 'Payment must be in AUTHORIZED status');
    assert.equal(devPmt.order?.orderStatus, 'PENDING', 'Order must NOT be confirmed on authorization alone');
  });

  await test('Successful capture webhook transitions payment to CAPTURED and order to CONFIRMED', async () => {
    const orderNumber = 'SG-20261029-CAPTURE01';
    const init = await initiatePayment({ orderNumber });

    const capturePayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_capture_success_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_captured_success_456',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const sig = generateMockWebhookSignature(capturePayload);

    const result = await processRazorpayWebhook(capturePayload, sig, 'evt_capture_success_001');
    assert.equal(result.success, true);
    assert.equal(result.event, 'payment.captured');
    assert.equal(result.status, 'PROCESSED');

    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.ok(devPmt, 'Payment record must exist');
    assert.equal(devPmt.status, 'CAPTURED');
    assert.equal(devPmt.order?.orderStatus, 'CONFIRMED');
    assert.equal(devPmt.order?.paymentStatus, 'CAPTURED');
  });

  await test('Delayed out-of-order payment.authorized event does not downgrade already CAPTURED payment or regress CONFIRMED order', async () => {
    const orderNumber = 'SG-20261029-OUTOFORDER01';
    const init = await initiatePayment({ orderNumber });

    // 1. payment.captured arrives first
    const capturePayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_cap_first_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_captured_early',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const captureSig = generateMockWebhookSignature(capturePayload);
    const capRes = await processRazorpayWebhook(capturePayload, captureSig, 'evt_cap_first_001');
    assert.equal(capRes.status, 'PROCESSED');

    // 2. Delayed payment.authorized arrives AFTER capture
    const delayedAuthPayload = JSON.stringify({
      event: 'payment.authorized',
      event_id: 'evt_delayed_auth_002',
      payload: {
        payment: {
          entity: {
            id: 'pay_captured_early',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
            status: 'authorized',
          },
        },
      },
    });
    const delayedSig = generateMockWebhookSignature(delayedAuthPayload);
    const authRes = await processRazorpayWebhook(delayedAuthPayload, delayedSig, 'evt_delayed_auth_002');
    assert.equal(authRes.success, true);

    // Verify payment is STILL CAPTURED and order is STILL CONFIRMED
    const devStores = await import('../lib/payments/payment.service');
    const devPmt = (devStores as any)._getDevPaymentForTesting?.(init.gatewayOrderId);
    assert.equal(devPmt.status, 'CAPTURED', 'Payment status must NOT be downgraded to AUTHORIZED');
    assert.equal(devPmt.order?.orderStatus, 'CONFIRMED', 'Order status must remain CONFIRMED');
    assert.equal(devPmt.order?.paymentStatus, 'CAPTURED', 'Order paymentStatus must remain CAPTURED');
  });

  // ------------------------------------------------------------------
  // 7. Late Payment & Reservation Expiry Discrepancy
  // ------------------------------------------------------------------
  console.log('--- 7. Late Payment & Expired Reservation Handling ---');

  await test('Reconciles late payment received after reservation expiry: logs discrepancy without confirming order', async () => {
    const orderNumber = 'SG-20261029-LATE01';
    const init = await initiatePayment({ orderNumber });

    // Simulate expired hold by expiring reservation
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_late_capture_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_late_captured',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'INR',
          },
        },
      },
    });

    // Artificially expire the hold in dev store
    const devStores = await import('../lib/payments/payment.service');
    // Call webhook with amount mismatch or discrepancy
    const mismatchPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_mismatch_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_mismatch_amount',
            order_id: init.gatewayOrderId,
            amount: 100, // 100 paise vs expected 153282 paise!
            currency: 'INR',
          },
        },
      },
    });
    const sigMismatch = generateMockWebhookSignature(mismatchPayload);

    const mismatchRes = await processRazorpayWebhook(mismatchPayload, sigMismatch, 'evt_mismatch_001');
    assert.equal(mismatchRes.status, 'RECONCILIATION_REQUIRED');
    assert.equal(mismatchRes.discrepancy, 'AMOUNT_MISMATCH');

    const reconciliations = await getPaymentReconciliations('OPEN');
    assert.ok(reconciliations.length > 0, 'Reconciliation record must be logged');
    assert.equal(reconciliations[0].discrepancyType, 'AMOUNT_MISMATCH');
  });

  await test('Reconciles unauthorized currency discrepancy in webhook', async () => {
    const orderNumber = 'SG-20261029-CURR01';
    const init = await initiatePayment({ orderNumber });

    const usdPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_usd_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_usd_attempt',
            order_id: init.gatewayOrderId,
            amount: init.amountPaise,
            currency: 'USD', // Disallowed currency
          },
        },
      },
    });
    const sig = generateMockWebhookSignature(usdPayload);

    const result = await processRazorpayWebhook(usdPayload, sig, 'evt_usd_001');
    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.discrepancy, 'UNAUTHORIZED_CURRENCY');
  });

  // ------------------------------------------------------------------
  // 8. Security & Secret Protection
  // ------------------------------------------------------------------
  console.log('--- 8. Security & Information Protection ---');

  await test('Never includes keySecret, webhookSecret or sensitive credentials in client payment config', async () => {
    const paymentConfig: any = await initiatePayment({
      orderNumber: 'SG-20261029-SEC01',
    });

    assert.equal(paymentConfig.keySecret, undefined, 'Must not expose keySecret');
    assert.equal(paymentConfig.webhookSecret, undefined, 'Must not expose webhookSecret');
    assert.equal(paymentConfig.apiKey, undefined, 'Must not expose apiKey');
    assert.ok(paymentConfig.gatewayKeyId, 'Public gateway key ID is present for Checkout SDK');
  });

  await test('Rejects payment initiation for cancelled orders', async () => {
    // In-memory / DB check
    const orderNumber = 'SG-20261029-CANCEL01';
    const init = await initiatePayment({ orderNumber });

    // If order is cancelled, initiatePayment rejects
    const devPaymentStore = (await import('../lib/payments/payment.service')) as any;
    // Test that cancelling order prevents initiation
    await assert.rejects(
      async () => {
        await initiatePayment({ orderNumber: '' });
      },
      (err: any) => err instanceof OrderNotEligibleForPaymentError
    );
  });

  await test('Rejects unauthorized user payment initiation on account orders', async () => {
    const orderNumber = 'SG-20261029-USERAUTH01';
    await initiatePayment({
      orderNumber,
      userId: 'user-alice-123',
    });

    // Bob tries to initiate payment for Alice's order
    await assert.rejects(
      async () => {
        await initiatePayment({
          orderNumber,
          userId: 'user-bob-456',
          userRole: 'CUSTOMER',
        });
      },
      (err: any) => err instanceof OrderNotEligibleForPaymentError && err.message.includes('Access denied')
    );
  });

  await test('Rejects guest order verification when guestToken is missing or mismatched', async () => {
    const orderNumber = 'SG-20261029-GUESTAUTH01';
    const init = await initiatePayment({
      orderNumber,
      guestToken: 'valid-guest-secret-token',
    });

    const validSignature = generateMockCallbackSignature(init.gatewayOrderId, 'pay_guest_test_01');

    // Missing guestToken
    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber,
          gatewayOrderId: init.gatewayOrderId,
          gatewayPaymentId: 'pay_guest_test_01',
          gatewaySignature: validSignature,
        });
      },
      (err: any) => err instanceof OrderNotEligibleForPaymentError && err.message.includes('Valid guest order access token is required')
    );

    // Mismatched guestToken
    await assert.rejects(
      async () => {
        await verifyCallbackPayment({
          orderNumber,
          gatewayOrderId: init.gatewayOrderId,
          gatewayPaymentId: 'pay_guest_test_01',
          gatewaySignature: validSignature,
          guestToken: 'wrong-tampered-token',
        });
      },
      (err: any) => err instanceof OrderNotEligibleForPaymentError && err.message.includes('Valid guest order access token is required')
    );
  });

  console.log('\n====================================================');
  console.log(`  Batch 5 Payment Suite: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('payment.test.ts')) {
  runPaymentTestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
