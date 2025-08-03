import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth/authService';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import type { LoginRequest } from '@/types/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { username, pin } = body;

    // Validate input
    if (!username || !pin) {
      return NextResponse.json(
        { error: 'Username and PIN are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const loginResult = await authService.login({ username, pin });

    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.message },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = createSession(loginResult.user!);

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: loginResult.user,
    });

    // Set session cookie
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}