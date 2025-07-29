import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services/database/products';
import { createProductVariantSchema } from '@/lib/validation/product';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createProductVariantSchema.parse(body);
    
    // Get product ID from query params
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID is required',
        },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(productId).success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }
    
    // Create the variant
    const variant = await productService.createVariant({
      ...validatedData,
      productId,
    });
    
    // Parse JSON fields for response
    const enhancedVariant = {
      ...variant,
      keywords: variant.keywords ? JSON.parse(variant.keywords) : [],
      attributes: variant.attributes ? JSON.parse(variant.attributes) : {},
    };
    
    return NextResponse.json(
      {
        success: true,
        data: enhancedVariant,
        message: 'Product variant created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product variant:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid variant data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product variant',
      },
      { status: 500 }
    );
  }
}