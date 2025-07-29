import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/services/search/searchEngine';
import type { SearchLanguage } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || '';
    const language = (searchParams.get('lang') || 'en') as SearchLanguage;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await searchEngine.getSuggestions(query, language);
    
    return NextResponse.json({ 
      suggestions: suggestions.slice(0, limit),
      query 
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, language = 'en' } = body;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    await searchEngine.updateSuggestions(query, language);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestions' },
      { status: 500 }
    );
  }
}