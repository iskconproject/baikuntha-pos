import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/services/search/searchEngine';
import type { SearchLanguage } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const language = (searchParams.get('lang') as SearchLanguage) || 'en';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        success: true,
      });
    }

    const suggestions = await searchEngine.getSuggestions(query, language);
    
    return NextResponse.json({
      suggestions: suggestions.slice(0, limit),
      success: true,
    });
  } catch (error) {
    console.error('Search suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}