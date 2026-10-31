import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);

    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variantId')?.trim();
    const reason = searchParams.get('reason')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (reason) where.reason = reason;

    const [adjustments, totalCount] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
              stockQuantity: true,
              product: { select: { id: true, name: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.inventoryAdjustment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        adjustments,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
