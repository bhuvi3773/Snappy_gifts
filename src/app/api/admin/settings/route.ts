import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { getStoreConfig, updateStoreConfig } from '@/lib/admin/admin.service';

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const config = await getStoreConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to retrieve store settings.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole([Role.ADMIN], req);
    const body = await req.json();

    const updated = await updateStoreConfig(body, user.id, user.role);
    return NextResponse.json({
      success: true,
      message: 'Store configuration updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to update store settings.' }, { status: 400 });
  }
}
