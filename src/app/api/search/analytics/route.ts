import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/database/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, resultCount, clickedProductId } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    await searchService.recordSearch(
      query,
      resultCount || 0,
      clickedProductId,
      // TODO: Get user ID from session/auth
      undefined
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to record analytics' },
      { status: 500 }
    );
  }
}