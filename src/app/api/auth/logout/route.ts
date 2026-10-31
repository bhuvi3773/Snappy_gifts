import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, invalidateSession } from '@/lib/auth/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (sessionCookie && sessionCookie.value) {
      await invalidateSession(sessionCookie.value);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    console.error('[API_AUTH_LOGOUT] Error:', error);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0, expires: new Date(0) });
    return response;
  }
}
