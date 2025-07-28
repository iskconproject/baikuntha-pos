import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/services/auth/authService';
import { createSession, setSessionCookie } from '@/lib/auth/session';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(8, 'PIN must not exceed 8 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: validation.error.errors.map(err => err.message),
        },
        { status: 400 }
      );
    }

    const { username, pin } = validation.data;

    // Attempt login
    const loginResult = await authService.login({ username, pin });

    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.message },
        { status: 401 }
      );
    }

    if (!loginResult.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = createSession(loginResult.user);
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: loginResult.user.id,
        username: loginResult.user.username,
        role: loginResult.user.role,
        isActive: loginResult.user.isActive,
        lastLoginAt: loginResult.user.lastLoginAt,
      },
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