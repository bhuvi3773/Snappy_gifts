import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { validateStockAdjustmentInput, AdjustStockInput } from '@/lib/catalog/validation';
import { executeStockAdjustment, InventoryError } from '@/lib/catalog/inventory';

export async function POST(req: Request) {
  try {
    const operator = await requireRole([Role.ADMIN, Role.STAFF], req);

    let body: AdjustStockInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = validateStockAdjustmentInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    const result = await executeStockAdjustment({
      variantId: body.variantId,
      adjustedQty: body.adjustedQty,
      reason: body.reason,
      referenceId: body.referenceId?.trim(),
      notes: body.notes?.trim(),
      userId: operator.id,
    });

    return NextResponse.json({
      success: true,
      message: `Inventory successfully adjusted. New stock balance: ${result.variant.stockQuantity}`,
      data: result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
