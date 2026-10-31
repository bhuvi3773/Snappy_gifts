import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { getAdminUserDetails, updateAdminUserStatusOrRole } from '@/lib/admin/admin.service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { id } = await params;

    const user = await getAdminUserDetails(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to retrieve user details.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole([Role.ADMIN], req);
    const { id } = await params;
    const body = await req.json();

    const updated = await updateAdminUserStatusOrRole(
      id,
      { role: body.role, isActive: body.isActive },
      user.id,
      user.role
    );

    return NextResponse.json({
      success: true,
      message: 'User account updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Failed to update user account.' }, { status: 400 });
  }
}
