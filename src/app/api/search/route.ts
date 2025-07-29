import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/services/search/searchEngine';
import type { SearchQuery, SearchLanguage } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category') || undefined;
    const language = (searchParams.get('lang') || 'en') as SearchLanguage;
    const sortBy = searchParams.get('sort') || 'relevance';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse filters
    const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined;
    const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined;
    const inStock = searchParams.get('inStock') === 'true';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    
    // Parse attributes filter (JSON string)
    let attributes: Record<string, string[]> = {};
    const attributesParam = searchParams.get('attributes');
    if (attributesParam) {
      try {
        attributes = JSON.parse(attributesParam);
      } catch (error) {
        console.warn('Invalid attributes filter:', error);
      }
    }

    const searchQuery: SearchQuery = {
      query,
      categoryId,
      language,
      sortBy: sortBy as any,
      limit,
      offset,
      filters: {
        priceMin,
        priceMax,
        inStock,
        categories,
        attributes,
      },
    };

    // Perform search
    const results = await searchEngine.search(searchQuery);

    // Update suggestions for future searches
    if (query.trim()) {
      await searchEngine.updateSuggestions(query, language);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchQuery: SearchQuery = body;

    // Validate required fields
    if (!searchQuery.query && !searchQuery.categoryId) {
      return NextResponse.json(
        { error: 'Query or category is required' },
        { status: 400 }
      );
    }

    // Perform search
    const results = await searchEngine.search(searchQuery);

    // Update suggestions for future searches
    if (searchQuery.query?.trim()) {
      await searchEngine.updateSuggestions(searchQuery.query, searchQuery.language || 'en');
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}