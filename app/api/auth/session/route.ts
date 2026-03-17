import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'gamma-session';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 horas (matches JWT expiration)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, user } = body;

    if (!accessToken || !user) {
      return NextResponse.json(
        { error: 'Missing accessToken or user' },
        { status: 400 }
      );
    }

    const sessionData = JSON.stringify({ accessToken, user });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionData, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting session cookie:', error);
    return NextResponse.json(
      { error: 'Failed to set session' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ session: null });
    }

    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error getting session cookie:', error);
    return NextResponse.json({ session: null });
  }
}
