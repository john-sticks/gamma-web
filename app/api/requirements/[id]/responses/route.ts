import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function getSessionToken() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('gamma-session');
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value).accessToken;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getSessionToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/responses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
