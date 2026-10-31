import { NextResponse } from 'next/server';
import { getOptionalUser } from '@/lib/auth/rbac';
import {
  approveOrderProofByCustomer,
  StaleProofVersionError,
  ProofConsentRequiredError,
  PersonalizationUnauthorizedError,
  PersonalizationValidationError,
} from '@/lib/personalization/personalization.service';
import { CatalogDatabaseError } from '@/lib/catalog/public-catalog.service';

/**
 * POST /api/orders/[orderNumber]/proofs/[orderItemId]/approve
 * 
 * Customer-facing approval endpoint for revised personalization proofs.
 * 
 * Safeguards:
 * 1. Authenticates registered customer via active session.
 * 2. Requires cryptographically secure `guestLookupToken` via `x-guest-token` header for guest orders.
 * 3. Verifies requester ownership and order item linkage.
 * 4. Strictly validates explicit customer consent (`consent === true`).
 * 5. Rejects stale, invalid, or mismatched proof versions (409 Conflict).
 * 6. Idempotently returns 200 OK if the exact version was already approved.
 * 7. Strictly protects against modifying staffReviewStatus, staffNotes, pricing, or order status.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string; orderItemId: string }> }
) {
  try {
    const { orderNumber, orderItemId } = await params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { proofVersion, consent } = body;

    // Consent check
    if (consent !== true) {
      return NextResponse.json(
        { error: 'Explicit customer consent is required to approve the proof.' },
        { status: 400 }
      );
    }

    // Version validation
    if (typeof proofVersion !== 'number' || !Number.isInteger(proofVersion) || proofVersion < 1) {
      return NextResponse.json(
        { error: 'A valid positive integer proofVersion is required.' },
        { status: 400 }
      );
    }

    // Authenticated session (if any)
    const user = await getOptionalUser(req);

    // Guest token MUST be provided via request header, NOT query-string parameter
    const guestToken = req.headers.get('x-guest-token');

    const result = await approveOrderProofByCustomer({
      orderNumber,
      orderItemId,
      proofVersion,
      consent,
      requesterUser: user,
      guestToken,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderItemId: result.orderItemId,
        proofVersion: result.proofVersion,
        customerApprovalStatus: result.customerApprovalStatus,
        customerApprovedAt: result.customerApprovedAt,
        customerApprovedBy: result.customerApprovedBy,
        staffReviewStatus: result.staffReviewStatus,
      },
      message: `Proof v${result.proofVersion} has been successfully approved for production.`,
    });
  } catch (error: any) {
    if (error instanceof ProofConsentRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StaleProofVersionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof PersonalizationUnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof PersonalizationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CatalogDatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to approve personalization proof.' },
      { status: 500 }
    );
  }
}
