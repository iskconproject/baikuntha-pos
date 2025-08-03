import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/services/search/searchEngine';
import type { SearchQuery } from '@/types/search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query: SearchQuery = {
      query: searchParams.get('q') || '',
      categoryId: searchParams.get('category') || undefined,
      language: (searchParams.get('lang') as any) || 'en',
      sortBy: (searchParams.get('sort') as any) || 'relevance',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      filters: {
        priceMin: searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined,
        priceMax: searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined,
        inStock: searchParams.get('inStock') === 'true',
        attributes: searchParams.get('attributes') ? JSON.parse(searchParams.get('attributes')!) : {},
      },
    };

    const result = await searchEngine.search(query);
    
    return NextResponse.json(result);
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
    
    if (!body.query && body.query !== '') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const query: SearchQuery = {
      query: body.query,
      categoryId: body.categoryId,
      language: body.language || 'en',
      sortBy: body.sortBy || 'relevance',
      limit: body.limit || 20,
      offset: body.offset || 0,
      filters: body.filters || {},
    };

    const result = await searchEngine.search(query);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}