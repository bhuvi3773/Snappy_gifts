import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/auth/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const sessionData = await validateSessionToken(sessionCookie.value);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const { user } = sessionData;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('[API_AUTH_ME] Error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
