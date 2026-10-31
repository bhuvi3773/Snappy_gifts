import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const user = await requireRole([Role.B2B_CLIENT, Role.ADMIN], req);
    return NextResponse.json({
      message: 'Corporate B2B access granted.',
      client: { id: user.id, email: user.email, role: user.role },
      data: { status: 'operational' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
