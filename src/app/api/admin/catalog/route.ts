import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await requireRole([Role.ADMIN, Role.STAFF], req);

    const [productCount, categoryCount, lowStockVariantsCount, recentAdjustments] = await Promise.all([
      prisma.product.count({ where: { isArchived: false } }),
      prisma.category.count(),
      prisma.productVariant.count({ where: { stockQuantity: { lt: 10 } } }),
      prisma.inventoryAdjustment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: { select: { sku: true, name: true, stockQuantity: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Admin access granted.',
      operator: { id: user.id, email: user.email, role: user.role },
      data: {
        status: 'operational',
        summary: {
          totalProducts: productCount,
          totalCategories: categoryCount,
          lowStockThreshold: 10,
          lowStockVariantsCount,
          recentAdjustments,
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
