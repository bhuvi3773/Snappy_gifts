import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role, InventoryAdjustmentReason } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateVariantInput, CreateVariantInput } from '@/lib/catalog/validation';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      include: {
        inventoryAdjustments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: variants });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: `Product with ID "${id}" not found` }, { status: 404 });
    }

    let body: CreateVariantInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateVariantInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    const normalizedSku = body.sku.trim().toUpperCase();

    // Check SKU uniqueness
    const existingSku = await prisma.productVariant.findUnique({ where: { sku: normalizedSku } });
    if (existingSku) {
      return NextResponse.json(
        { error: `Variant with SKU "${normalizedSku}" already exists in the catalog.` },
        { status: 409 }
      );
    }

    const initialStock = body.stockQuantity || 0;

    const created = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId: id,
          name: body.name.trim(),
          sku: normalizedSku,
          attributes: body.attributes,
          pricePaise: body.pricePaise,
          stockQuantity: initialStock,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryAdjustment.create({
          data: {
            variantId: variant.id,
            sku: normalizedSku,
            productName: product.name,
            previousStock: 0,
            adjustedQty: initialStock,
            newStock: initialStock,
            reason: InventoryAdjustmentReason.RESTOCK,
            referenceId: 'INITIAL_STOCK',
            userId: operator.id,
            notes: 'Initial inventory on variant creation',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_VARIANT_CREATED',
          resource: `ProductVariant:${variant.id}`,
          details: {
            productId: id,
            sku: normalizedSku,
            name: variant.name,
            pricePaise: variant.pricePaise,
            initialStock,
          },
        },
      });

      return variant;
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
