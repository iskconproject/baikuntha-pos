import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/database/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (typeof body.resultCount !== 'number') {
      return NextResponse.json(
        { error: 'Result count is required' },
        { status: 400 }
      );
    }

    await searchService.recordSearch(
      body.query,
      body.resultCount,
      body.clickedProductId,
      body.userId
    );
    
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
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');

    if (!type || !['popular', 'no-results', 'trends', 'click-through'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid analytics type' },
        { status: 400 }
      );
    }

    let data: any[] = [];

    switch (type) {
      case 'popular':
        data = await searchService.getPopularSearches(limit, days);
        break;
      case 'no-results':
        data = await searchService.getNoResultSearches(limit, days);
        break;
      case 'trends':
        data = await searchService.getSearchTrends(days);
        break;
      case 'click-through':
        data = await searchService.getClickThroughRates(limit, days);
        break;
    }
    
    return NextResponse.json({
      type,
      data
    });
  } catch (error) {
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}