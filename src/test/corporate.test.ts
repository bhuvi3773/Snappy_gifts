import assert from 'node:assert/strict';
import {
  registerCorporateAccount,
  getCorporateAccount,
  reviewCorporateAccount,
  addCorporateMember,
  removeCorporateMember,
  verifyCorporatePermission,
  createCorporateAddress,
  listCorporateAddresses,
  createCorporateRFQ,
  getCorporateRFQ,
  listCorporateRFQs,
  updateCorporateRFQStatus,
  createPriceAgreement,
  listPriceAgreements,
  resolveCorporateUnitPrice,
  createCorporateQuote,
  reviseCorporateQuote,
  getCorporateQuote,
  respondToCorporateQuote,
  parseAndValidateCorporateCsv,
  createCorporateOrderGroup,
  getCorporateOrderGroup,
  resetCorporateDevStores,
  CorporateValidationError,
  CorporatePermissionError,
  CorporateNotFoundError,
  CorporateStateError,
  sanitizeCsvField,
} from '../lib/corporate/corporate.service';
import { DEV_ORDERS_STORE } from '../lib/orders/order.service';

export async function runCorporateTestSuite() {
  console.log('====================================================');
  console.log('  Snappy Gifts — Batch 9A: Corporate B2B & RFQ Tests ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✘ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}\n`);
      failed++;
    }
  }

  // Reset stores for deterministic test execution
  resetCorporateDevStores();

  // Test Fixture IDs
  const userOwnerId = 'user_corp_owner_1';
  const userRequesterId = 'user_corp_req_1';
  const userApproverId = 'user_corp_app_1';
  const userOtherCompanyId = 'user_corp_other_1';
  const adminUserId = 'user_admin_staff_1';

  let orgAId = '';
  let orgBId = '';

  // ------------------------------------------------------------------
  // 1. Corporate Account Onboarding & RBAC
  // ------------------------------------------------------------------
  console.log('--- 1. Corporate Registration, Status Lifecycle & RBAC ---');

  await test('Registers corporate account with status PENDING_APPROVAL and assigns submitter as OWNER', async () => {
    const org = await registerCorporateAccount(userOwnerId, 'owner@acme.com', 'Acme Owner', {
      legalName: 'Acme Enterprise India Pvt Ltd',
      displayName: 'Acme Corp',
      companyEmail: 'procurement@acme.com',
      contactPerson: 'Vikram Mehta',
      contactPhone: '9820112233',
      registeredAddress: {
        street: '12 Embassy Tech Village, Marathahalli',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560103',
      },
      gstin: '29AABCA1234F1Z5',
      businessDetails: 'Enterprise Software & Cloud Services',
    });

    assert.ok(org.id);
    assert.equal(org.displayName, 'Acme Corp');
    assert.equal(org.status, 'PENDING_APPROVAL');

    orgAId = org.id;

    // Verify submitter is OWNER
    const { membership } = await verifyCorporatePermission(orgAId, userOwnerId, ['OWNER']);
    assert.equal(membership.role, 'OWNER');
    assert.equal(membership.isActive, true);
  });

  await test('Rejects registration with invalid contact phone or invalid PIN code', async () => {
    await assert.rejects(
      async () => {
        await registerCorporateAccount('user_bad', 'bad@test.com', 'Bad Tester', {
          legalName: 'Bad Co',
          displayName: 'Bad',
          companyEmail: 'bad@test.com',
          contactPerson: 'Bad',
          contactPhone: '123', // < 10 digits
          registeredAddress: {
            street: 'Some street',
            city: 'City',
            state: 'State',
            stateCode: '08',
            pincode: '999999', // Invalid PIN
          },
        });
      },
      CorporateValidationError
    );
  });

  await test('Admin approves corporate application, transitioning to APPROVED', async () => {
    const updated = await reviewCorporateAccount(orgAId, adminUserId, 'APPROVE');
    assert.equal(updated.status, 'APPROVED');
    assert.equal(updated.reviewedBy, adminUserId);
  });

  await test('Admin rejects application requires clear reason', async () => {
    const orgReject = await registerCorporateAccount('user_rej', 'rej@dummy.com', 'Dummy', {
      legalName: 'Dummy Co',
      displayName: 'Dummy',
      companyEmail: 'proc@dummy.com',
      contactPerson: 'Contact',
      contactPhone: '9876543210',
      registeredAddress: {
        street: 'Street',
        city: 'Jaipur',
        state: 'Rajasthan',
        stateCode: '08',
        pincode: '302001',
      },
    });

    await assert.rejects(
      async () => {
        await reviewCorporateAccount(orgReject.id, adminUserId, 'REJECT', '');
      },
      CorporateValidationError
    );

    const rejected = await reviewCorporateAccount(
      orgReject.id,
      adminUserId,
      'REJECT',
      'Incomplete tax documentation provided.'
    );
    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.rejectionReason, 'Incomplete tax documentation provided.');
  });

  await test('OWNER adds REQUESTER and APPROVER members to company', async () => {
    const memReq = await addCorporateMember(
      orgAId,
      userOwnerId,
      userRequesterId,
      'req@acme.com',
      'Acme Requester',
      'REQUESTER'
    );
    assert.equal(memReq.role, 'REQUESTER');

    const memApp = await addCorporateMember(
      orgAId,
      userOwnerId,
      userApproverId,
      'app@acme.com',
      'Acme Approver',
      'APPROVER'
    );
    assert.equal(memApp.role, 'APPROVER');
  });

  await test('REQUESTER cannot add other members (privilege escalation blocked)', async () => {
    await assert.rejects(
      async () => {
        await addCorporateMember(
          orgAId,
          userRequesterId, // Not an OWNER!
          'hacker@acme.com',
          'hacker@acme.com',
          'Hacker',
          'OWNER'
        );
      },
      CorporatePermissionError
    );
  });

  await test('Cross-company tenant isolation prevents user from Org B accessing Org A', async () => {
    const orgB = await registerCorporateAccount(userOtherCompanyId, 'other@beta.com', 'Beta Owner', {
      legalName: 'Beta Systems Private Limited',
      displayName: 'Beta Systems',
      companyEmail: 'procurement@beta.com',
      contactPerson: 'Suresh Kumar',
      contactPhone: '9845012345',
      registeredAddress: {
        street: 'Outer Ring Road',
        city: 'Hyderabad',
        state: 'Telangana',
        stateCode: '36',
        pincode: '500081',
      },
    });
    orgBId = orgB.id;
    await reviewCorporateAccount(orgBId, adminUserId, 'APPROVE');

    // userOtherCompanyId attempts to access Org A
    await assert.rejects(
      async () => {
        await verifyCorporatePermission(orgAId, userOtherCompanyId, ['OWNER', 'REQUESTER']);
      },
      CorporatePermissionError
    );
  });

  await test('Cannot remove the sole OWNER of an organization', async () => {
    await assert.rejects(
      async () => {
        await removeCorporateMember(orgAId, userOwnerId, userOwnerId);
      },
      CorporateValidationError
    );
  });

  // ------------------------------------------------------------------
  // 2. Request for Quotation (RFQ) Workflow
  // ------------------------------------------------------------------
  console.log('\n--- 2. Corporate Request for Quotation (RFQ) Workflow ---');

  let rfqId = '';

  await test('REQUESTER successfully submits an RFQ for 100 units across 4 locations', async () => {
    const rfq = await createCorporateRFQ(orgAId, userRequesterId, {
      deliveryLocationsCount: 4,
      brandingLogoRequired: true,
      customPackagingRequired: true,
      additionalInstructions: 'Silver laser engraving with corporate logo on top lid.',
      items: [
        {
          productId: 'prod-1', // Royale Ceramic Mug
          quantity: 100,
          personalizationNote: 'Excellence in Engineering 2026',
        },
      ],
    });

    assert.ok(rfq.id);
    assert.ok(rfq.rfqNumber.startsWith('RFQ-2026-'));
    assert.equal(rfq.status, 'SUBMITTED');
    assert.equal(rfq.numberOfLocations, 4);
    assert.equal(rfq.items.length, 1);
    assert.equal(rfq.items[0].requestedQuantity, 100);

    rfqId = rfq.id;
  });

  await test('Rejects RFQ containing non-existent product in catalogue', async () => {
    await assert.rejects(
      async () => {
        await createCorporateRFQ(orgAId, userRequesterId, {
          items: [{ productId: 'invalid-prod-99999', quantity: 10 }],
        });
      },
      CorporateValidationError
    );
  });

  await test('RFQ status transition state machine enforces valid transitions', async () => {
    // SUBMITTED -> UNDER_REVIEW
    const underReview = await updateCorporateRFQStatus(rfqId, 'UNDER_REVIEW', adminUserId, {
      internalNotes: 'Sales team reviewing special custom packaging requirements.',
    });
    assert.equal(underReview.status, 'UNDER_REVIEW');

    // Invalid transition: UNDER_REVIEW directly to ACCEPTED without quote
    await assert.rejects(
      async () => {
        await updateCorporateRFQStatus(rfqId, 'ACCEPTED', adminUserId);
      },
      CorporateStateError
    );
  });

  await test('Sanitizes internal admin notes from customer-facing RFQ queries', async () => {
    // Non-staff query
    const customerView = await getCorporateRFQ(rfqId, orgAId, false);
    assert.strictEqual(customerView.internalAdminNotes, undefined);

    // Staff query includes internal notes
    const staffView = await getCorporateRFQ(rfqId, orgAId, true);
    assert.ok(staffView.internalAdminNotes);
  });

  // ------------------------------------------------------------------
  // 3. Corporate Pricing & Agreements Engine
  // ------------------------------------------------------------------
  console.log('\n--- 3. Corporate Pricing, Price Agreements & Priority Engine ---');

  await test('Standard quantity bulk tier applies automatically (e.g. 100 units = 15% discount)', async () => {
    // prod-1 base price = ₹1,299.00 = 129,900 paise. 15% off = ~110,415 paise
    const pricing = await resolveCorporateUnitPrice('prod-1', undefined, 100);
    assert.equal(pricing.pricingSource, 'BULK_TIER');
    assert.equal(pricing.unitPricePaise, Math.round(129900 * 0.85));
  });

  await test('Admin negotiates corporate price agreement with quantity tiers for Org A', async () => {
    const agreement = await createPriceAgreement(
      {
        organizationId: orgAId,
        productId: 'prod-1',
        agreementName: 'Acme Annual Master Services Agreement 2026',
        unitPricePaise: 95000, // Special ₹950 unit price
        effectiveFrom: new Date(Date.now() - 86400000).toISOString(),
        effectiveTo: new Date(Date.now() + 365 * 86400000).toISOString(),
        negotiationReason: 'Annual volume commitment of 1,000+ units approved by VP Sales.',
        tiers: [
          { minQuantity: 1, maxQuantity: 49, unitPricePaise: 98000 },
          { minQuantity: 50, maxQuantity: 199, unitPricePaise: 92000 }, // ₹920 for 100 qty
          { minQuantity: 200, unitPricePaise: 85000 },
        ],
      },
      adminUserId
    );

    assert.ok(agreement.id);
    assert.equal(agreement.negotiatedBy, adminUserId);

    // Verify resolved price takes precedence over generic bulk tier
    const resolved = await resolveCorporateUnitPrice('prod-1', undefined, 100, orgAId);
    assert.equal(resolved.pricingSource, 'CORPORATE_AGREEMENT');
    assert.equal(resolved.unitPricePaise, 92000); // Matched 50-199 tier
  });

  await test('Expired or inactive agreement falls back cleanly to bulk tier', async () => {
    await createPriceAgreement(
      {
        organizationId: orgBId,
        productId: 'prod-1',
        agreementName: 'Expired 2025 Deal',
        unitPricePaise: 80000,
        effectiveFrom: new Date('2025-01-01').toISOString(),
        effectiveTo: new Date('2025-12-31').toISOString(), // Expired
      },
      adminUserId
    );

    const resolved = await resolveCorporateUnitPrice('prod-1', undefined, 100, orgBId);
    assert.equal(resolved.pricingSource, 'BULK_TIER');
    assert.equal(resolved.unitPricePaise, Math.round(129900 * 0.85));
  });

  // ------------------------------------------------------------------
  // 4. Quotation Creation, Revisions & Approvals
  // ------------------------------------------------------------------
  console.log('\n--- 4. Quotation Creation, Revisions & Approval Lifecycle ---');

  let quoteId = '';

  await test('Admin issues formal Quotation (Rev 1) from RFQ using integer paise and GST', async () => {
    const quote = await createCorporateQuote(
      {
        rfqId,
        organizationId: orgAId,
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        commercialTerms: 'Payment: 100% advance. Delivery: 7-10 business days.',
        customerNotes: 'Special festive pricing applied.',
        items: [
          {
            productId: 'prod-1',
            quantity: 100,
            unitPricePaise: 92000, // ₹920 agreed
            customizationFeePaise: 5000, // ₹50 logo
          },
        ],
      },
      adminUserId
    );

    assert.ok(quote.id);
    assert.ok(quote.quoteNumber.startsWith('QT-2026-'));
    assert.equal(quote.revision, 1);
    assert.equal(quote.isLatestRevision, true);
    assert.equal(quote.status, 'ISSUED');

    // Subtotal: 100 * 92000 = 9,200,000 paise (₹92,000)
    assert.equal(quote.itemsSubtotalPaise, 9200000n);
    // Customization: 100 * 5000 = 500,000 paise (₹5,000)
    assert.equal(quote.customizationTotalPaise, 500000n);
    // Taxable: 9,700,000 paise. 18% GST = 1,746,000 paise (₹17,460)
    assert.equal(quote.taxableAmountPaise, 9700000n);
    assert.equal(quote.taxTotalPaise, 1746000n);
    // Grand Total: 9,700,000 + 1,746,000 = 11,446,000 paise (₹114,460)
    assert.equal(quote.grandTotalPaise, 11446000n);

    quoteId = quote.id;

    // Verify RFQ status transitioned to QUOTED
    const rfq = await getCorporateRFQ(rfqId, orgAId, false);
    assert.equal(rfq.status, 'QUOTED');
  });

  await test('REQUESTER cannot approve quotation (permission denied)', async () => {
    await assert.rejects(
      async () => {
        await respondToCorporateQuote(quoteId, orgAId, userRequesterId, 'ACCEPT');
      },
      CorporatePermissionError
    );
  });

  await test('Another organization cannot accept the quotation (tenant boundary enforcement)', async () => {
    await assert.rejects(
      async () => {
        await respondToCorporateQuote(quoteId, orgBId, userOtherCompanyId, 'ACCEPT');
      },
      CorporatePermissionError
    );
  });

  await test('Admin issues Revision 2 of quotation; supersedes and invalidates Revision 1', async () => {
    const rev2 = await reviseCorporateQuote(
      quoteId,
      {
        customerNotes: 'Revision 2: Added 5% promotional discount on subtotal.',
        items: [
          {
            productId: 'prod-1',
            quantity: 100,
            unitPricePaise: 92000,
            customizationFeePaise: 5000,
            discountPercent: 5,
          },
        ],
      },
      adminUserId
    );

    assert.equal(rev2.revision, 2);
    assert.equal(rev2.isLatestRevision, true);
    assert.equal(rev2.status, 'ISSUED');

    // Check old revision status is SUPERSEDED
    const rev1 = await getCorporateQuote(quoteId, orgAId, false);
    assert.equal(rev1.isLatestRevision, false);
    assert.equal(rev1.status, 'SUPERSEDED');

    // Attempting to accept superseded Rev 1 is strictly rejected
    await assert.rejects(
      async () => {
        await respondToCorporateQuote(quoteId, orgAId, userApproverId, 'ACCEPT');
      },
      CorporateValidationError
    );

    quoteId = rev2.id; // Update active quoteId to Rev 2
  });

  await test('Corporate APPROVER accepts active quotation; updates status to ACCEPTED idempotently', async () => {
    const accepted = await respondToCorporateQuote(quoteId, orgAId, userApproverId, 'ACCEPT');
    assert.equal(accepted.status, 'ACCEPTED');
    assert.equal(accepted.approvedById, userApproverId);
    assert.ok(accepted.approvedAt);

    // Repeated call is idempotent
    const reAccept = await respondToCorporateQuote(quoteId, orgAId, userApproverId, 'ACCEPT');
    assert.equal(reAccept.status, 'ACCEPTED');

    // Once accepted, admin cannot revise it silently
    await assert.rejects(
      async () => {
        await reviseCorporateQuote(quoteId, {}, adminUserId);
      },
      CorporateValidationError
    );
  });

  // ------------------------------------------------------------------
  // 5. CSV Bulk Ordering, Formula Injection & Sanitization
  // ------------------------------------------------------------------
  console.log('\n--- 5. CSV Bulk Ordering, Validation & Formula Injection Defense ---');

  await test('Neutralizes dangerous formula injection prefixes in CSV fields', () => {
    assert.equal(sanitizeCsvField('=SUM(A1:A10)'), 'SUM(A1:A10)');
    assert.equal(sanitizeCsvField('+cmd|calc!A1'), 'cmd|calc!A1');
    assert.equal(sanitizeCsvField('@12345'), '12345');
    assert.equal(sanitizeCsvField('  -500  '), '500');
    assert.equal(sanitizeCsvField('\tDangerous'), 'Dangerous');
    assert.equal(sanitizeCsvField('Standard Name'), 'Standard Name');
  });

  await test('Validates well-formed CSV with recipient details and product SKU', () => {
    const validCsv = `Recipient Name,Recipient Phone,Recipient Email,Product SKU,Quantity,Address Line 1,Address Line 2,City,State,PIN Code,Department,Personalization Note
Rohan Sharma,9820112233,rohan@acme.com,SKU-prod-1,25,Flat 301 Palm Grove,Powai,Mumbai,Maharashtra,400076,Engineering,Keep shining!
Priyanka Verma,9811033445,priyanka@acme.com,SKU-prod-1,25,B-12 Green Park Ext,,New Delhi,Delhi,110016,Product,Welcome aboard!
Karthik R,9845077889,karthik@acme.com,SKU-prod-1,25,Plot 45 Indiranagar,100ft Rd,Bengaluru,Karnataka,560038,Design,Congrats on 3 yrs!
Ananya Sen,9830022334,ananya@acme.com,SKU-prod-1,25,Salt Lake Sector V,,Kolkata,West Bengal,700091,Finance,Great quarter!`;

    const summary = parseAndValidateCorporateCsv(validCsv);
    assert.equal(summary.totalRows, 4);
    assert.equal(summary.validRowsCount, 4);
    assert.equal(summary.invalidRowsCount, 0);
    assert.equal(summary.skuBreakdown['SKU-PROD-1'].quantity, 100);
  });

  await test('Flags row-level errors for invalid PIN code, phone, SKU, or duplicate rows', () => {
    const invalidCsv = `Recipient Name,Recipient Phone,Product SKU,Quantity,Address Line 1,City,State,PIN Code
Rohan Sharma,9820112233,SKU-prod-1,10,Street Address,Mumbai,Maharashtra,400076
Bad Phone User,123,SKU-prod-1,10,Street Address,Mumbai,Maharashtra,400076
Bad PIN User,9820112234,SKU-prod-1,10,Street Address,Mumbai,Maharashtra,012345
Invalid SKU User,9820112235,SKU-NON-EXISTENT,10,Street Address,Mumbai,Maharashtra,400076
Duplicate User,9820112233,SKU-prod-1,10,Street Address,Mumbai,Maharashtra,400076`;

    const summary = parseAndValidateCorporateCsv(invalidCsv);
    assert.equal(summary.totalRows, 5);
    assert.equal(summary.validRowsCount, 1);
    assert.equal(summary.invalidRowsCount, 4);
    assert.ok(summary.errors.length >= 4);
  });

  await test('Rejects CSV with missing required headers', () => {
    const badHeadersCsv = `Name,Phone,Quantity,Street\nRohan,9820112233,10,Street`;
    assert.throws(
      () => parseAndValidateCorporateCsv(badHeadersCsv),
      CorporateValidationError
    );
  });

  // ------------------------------------------------------------------
  // 6. Multi-Address Delivery Allocations & Grouped Orders
  // ------------------------------------------------------------------
  console.log('\n--- 6. Multi-Address Delivery Allocation & Grouped Orders ---');

  let orderGroupId = '';

  await test('Rejects order group creation if allocated quantities do not reconcile with accepted quote', async () => {
    // Quote is for 100 units. Attempting to allocate only 50 units
    await assert.rejects(
      async () => {
        await createCorporateOrderGroup(orgAId, userOwnerId, {
          quoteId,
          paymentMethod: 'ONLINE_UPI',
          allocations: [
            {
              recipientName: 'Rohan Sharma',
              recipientPhone: '9820112233',
              street: 'Palm Grove',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400076',
              quantity: 50, // Missing 50 units!
              productId: 'prod-1',
              sku: 'SKU-prod-1',
            },
          ],
        });
      },
      CorporateValidationError
    );
  });

  await test('Successfully creates CorporateOrderGroup with 4 child orders reconciling exactly 100 units', async () => {
    const groupOrder = await createCorporateOrderGroup(orgAId, userOwnerId, {
      quoteId,
      paymentMethod: 'ONLINE_UPI',
      paymentReference: 'UPI-TXN-CORP-987654',
      allocations: [
        {
          recipientName: 'Rohan Sharma',
          recipientPhone: '9820112233',
          recipientEmail: 'rohan@acme.com',
          street: 'Flat 301 Palm Grove, Powai',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '400076',
          department: 'Engineering',
          customGiftNote: 'Keep shining!',
          quantity: 25,
          productId: 'prod-1',
          sku: 'SKU-prod-1',
        },
        {
          recipientName: 'Priyanka Verma',
          recipientPhone: '9811033445',
          recipientEmail: 'priyanka@acme.com',
          street: 'B-12 Green Park Ext',
          city: 'New Delhi',
          state: 'Delhi',
          stateCode: '07',
          pincode: '110016',
          department: 'Product',
          customGiftNote: 'Welcome aboard!',
          quantity: 25,
          productId: 'prod-1',
          sku: 'SKU-prod-1',
        },
        {
          recipientName: 'Karthik Ramanathan',
          recipientPhone: '9845077889',
          recipientEmail: 'karthik@acme.com',
          street: 'Plot 45 Indiranagar, 100ft Rd',
          city: 'Bengaluru',
          state: 'Karnataka',
          stateCode: '29',
          pincode: '560038',
          department: 'Design',
          customGiftNote: 'Congrats on 3 years!',
          quantity: 25,
          productId: 'prod-1',
          sku: 'SKU-prod-1',
        },
        {
          recipientName: 'Ananya Sen',
          recipientPhone: '9830022334',
          recipientEmail: 'ananya@acme.com',
          street: 'Salt Lake Sector V',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700091',
          department: 'Finance',
          customGiftNote: 'Great quarter!',
          quantity: 25,
          productId: 'prod-1',
          sku: 'SKU-prod-1',
        },
      ],
    });

    assert.ok(groupOrder.id);
    assert.ok(groupOrder.groupOrderNumber.startsWith('CORP-2026-'));
    assert.equal(groupOrder.totalDestinations, 4);
    assert.equal(groupOrder.totalQuantity, 100);
    assert.equal(groupOrder.orders.length, 4);

    // Verify child orders have distinct destinations, state codes and shipment tracking
    assert.equal(groupOrder.orders[0].destinationStateCode, '27');
    assert.equal(groupOrder.orders[1].destinationStateCode, '07');
    assert.equal(groupOrder.orders[2].destinationStateCode, '29');
    assert.equal(groupOrder.orders[3].destinationStateCode, '19');

    for (const child of groupOrder.orders) {
      assert.ok(child.shipment?.awbNumber);
      assert.equal(child.shipment?.dispatchStatus, 'MANIFEST_GENERATED');
      assert.equal(child.paymentStatus, 'PAID');
    }

    orderGroupId = groupOrder.id;
  });

  await test('Prevents duplicate order group creation for the same quote', async () => {
    await assert.rejects(
      async () => {
        await createCorporateOrderGroup(orgAId, userOwnerId, {
          quoteId,
          paymentMethod: 'ONLINE_UPI',
          allocations: [
            {
              recipientName: 'Rohan Sharma',
              recipientPhone: '9820112233',
              street: 'Palm Grove',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400076',
              quantity: 100,
              productId: 'prod-1',
              sku: 'SKU-prod-1',
            },
          ],
        });
      },
      CorporateValidationError
    );
  });

  await test('Corporate order group can be retrieved and isolates access from other organizations', async () => {
    const fetched = await getCorporateOrderGroup(orderGroupId, orgAId, false);
    assert.equal(fetched.totalDestinations, 4);

    // Other organization denied
    await assert.rejects(
      async () => {
        await getCorporateOrderGroup(orderGroupId, orgBId, false);
      },
      CorporatePermissionError
    );
  });

  console.log('\n----------------------------------------------------');
  console.log(`Corporate B2B Suite Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  return { passed, failed };
}

if (process.argv[1]?.includes('corporate.test')) {
  runCorporateTestSuite().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  }).catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
