import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireRole([Role.ADMIN], req);
    const { id } = await params;

    let body: { imageIds: string[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.imageIds) || body.imageIds.length === 0) {
      return NextResponse.json({ error: 'imageIds must be a non-empty array of image IDs' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < body.imageIds.length; i++) {
        const imageId = body.imageIds[i];
        await tx.productImage.updateMany({
          where: { id: imageId, productId: id },
          data: { displayOrder: i + 1 },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: operator.id,
          action: 'CATALOG_IMAGES_REORDERED',
          resource: `Product:${id}`,
          details: { newOrder: body.imageIds },
        },
      });
    });

    const updatedImages = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: updatedImages });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
