import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/catalog/validation';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true, name: true, slug: true, basePricePaise: true, isActive: true },
          take: 50,
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: `Category with ID "${id}" not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: `Category with ID "${id}" not found` }, { status: 404 });
    }

    let body: { name?: string; slug?: string; description?: string; imageUrl?: string; isActive?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = !!body.isActive;

    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug);
      if (newSlug !== existing.slug) {
        const slugExists = await prisma.category.findUnique({ where: { slug: newSlug } });
        if (slugExists) {
          return NextResponse.json({ error: `Slug "${newSlug}" is already in use.` }, { status: 409 });
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_CATEGORY_UPDATED',
          resource: `Category:${id}`,
          details: { changes: updateData },
        },
      });

      return cat;
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: `Category with ID "${id}" not found` }, { status: 404 });
    }

    if (existing._count.products > 0) {
      // Soft-deactivate if products are linked
      const deactivated = await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_CATEGORY_DEACTIVATED',
          resource: `Category:${id}`,
          details: { reason: `Category has ${existing._count.products} associated products; deactivated rather than deleted.` },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'DEACTIVATED',
        message: `Category "${existing.name}" has ${existing._count.products} associated products and was deactivated.`,
        data: deactivated,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_CATEGORY_DELETED',
          resource: `Category:${id}`,
          details: { name: existing.name, slug: existing.slug },
        },
      });
    });

    return NextResponse.json({
      success: true,
      action: 'DELETED',
      message: `Category "${existing.name}" deleted successfully.`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
