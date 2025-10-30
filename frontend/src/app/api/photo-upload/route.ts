import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demo purposes. Replace with Redis or DB in production.
const photoStore: Record<string, string> = {};

export async function POST(req: NextRequest) {
  try {
    const { session, image } = await req.json();
    if (!session || !image) {
      return NextResponse.json({ error: 'Missing session or image' }, { status: 400 });
    }
    // Store image by session token
    photoStore[session] = image;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get('session');
  if (!session) {
    return NextResponse.json({ error: 'Missing session' }, { status: 400 });
  }
  const image = photoStore[session];
  if (!image) {
    return NextResponse.json({ status: 'pending' });
  }
  return NextResponse.json({ status: 'ready', image });
}
