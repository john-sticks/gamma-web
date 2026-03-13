import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/event-titles`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching event titles:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
