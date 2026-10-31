import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteVariantSafely, InventoryError } from '@/lib/catalog/inventory';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id, variantId } = await params;

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
      include: {
        inventoryAdjustments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!variant) {
      return NextResponse.json({ error: `Variant with ID "${variantId}" not found for product "${id}"` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: variant });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id, variantId } = await params;

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: `Variant with ID "${variantId}" not found for product "${id}"` }, { status: 404 });
    }

    let body: {
      name?: string;
      pricePaise?: number;
      attributes?: Record<string, string>;
      isActive?: boolean;
      isArchived?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.pricePaise !== undefined) {
      if (!Number.isInteger(body.pricePaise) || body.pricePaise <= 0) {
        return NextResponse.json({ error: 'pricePaise must be a positive integer' }, { status: 400 });
      }
      updateData.pricePaise = body.pricePaise;
    }
    if (body.attributes !== undefined) updateData.attributes = body.attributes;
    if (body.isActive !== undefined) updateData.isActive = !!body.isActive;
    if (body.isArchived !== undefined) updateData.isArchived = !!body.isArchived;

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.update({
        where: { id: variantId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_VARIANT_UPDATED',
          resource: `ProductVariant:${variantId} (${v.sku})`,
          details: { changes: updateData, previousPricePaise: existing.pricePaise },
        },
      });

      return v;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id, variantId } = await params;

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: `Variant with ID "${variantId}" not found for product "${id}"` }, { status: 404 });
    }

    const result = await deleteVariantSafely(variantId, operator.id);

    return NextResponse.json({
      success: true,
      action: result.action,
      message:
        result.action === 'ARCHIVED'
          ? `Variant "${existing.sku}" has inventory history and was safely archived rather than deleted.`
          : `Variant "${existing.sku}" deleted successfully.`,
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
