import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/services/search/searchEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const language = (searchParams.get('lang') as any) || 'en';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({
        query,
        suggestions: []
      });
    }

    const suggestions = await searchEngine.getSuggestions(query, language);
    
    return NextResponse.json({
      query,
      suggestions: suggestions.slice(0, limit)
    });
  } catch (error) {
    console.error('Search suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.query || body.query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    await searchEngine.updateSuggestions(body.query, body.language || 'en');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestions' },
      { status: 500 }
    );
  }
}