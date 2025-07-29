import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/database/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, resultCount, clickedProductId, userId } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (clickedProductId) {
      // Record product click
      const searchRecord = await searchService.recordSearch(query, resultCount, userId);
      await searchService.recordProductClick(searchRecord.id, clickedProductId);
    } else {
      // Record search only
      await searchService.recordSearch(query, resultCount, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to record analytics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'popular';
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');

    let data;

    switch (type) {
      case 'popular':
        data = await searchService.getPopularSearches(limit, days);
        break;
      case 'no-results':
        data = await searchService.getSearchesWithNoResults(limit, days);
        break;
      case 'trends':
        data = await searchService.getSearchTrends(days);
        break;
      case 'click-through':
        data = await searchService.getClickThroughRates(limit, days);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ data, type });
  } catch (error) {
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}