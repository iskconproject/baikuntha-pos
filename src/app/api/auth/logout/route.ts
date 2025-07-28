import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session cookie
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}