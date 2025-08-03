import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services/database/products';
import { productSearchSchema } from '@/lib/validation/product';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse filters if provided
    if (queryParams.filters && typeof queryParams.filters === 'string') {
      try {
        queryParams.filters = JSON.parse(queryParams.filters);
      } catch {
        delete queryParams.filters;
      }
    } else if (queryParams.filters) {
      delete queryParams.filters;
    }
    
    // Validate query parameters
    const validatedQuery = productSearchSchema.parse(queryParams);
    
    // Get user ID from session/auth (placeholder for now)
    const userId = request.headers.get('x-user-id') || undefined;
    
    const result = await productService.searchProducts(validatedQuery, userId);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedQuery = productSearchSchema.parse(body);
    
    // Get user ID from session/auth (placeholder for now)
    const userId = request.headers.get('x-user-id') || undefined;
    
    const result = await productService.searchProducts(validatedQuery, userId);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
      },
      { status: 500 }
    );
  }
}