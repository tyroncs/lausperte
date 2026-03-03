import { NextRequest, NextResponse } from 'next/server';
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  isAdminAuthenticated,
  isValidAdminSecret,
  setAdminSessionCookie,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const secret = typeof body?.secret === 'string' ? body.secret : '';

    if (!secret || !isValidAdminSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    setAdminSessionCookie(response, createAdminSessionToken());
    return response;
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookie(response);
  return response;
}
