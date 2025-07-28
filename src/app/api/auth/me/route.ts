import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Get current user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}