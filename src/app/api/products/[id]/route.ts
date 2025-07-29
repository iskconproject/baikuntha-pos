import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services/database/products';
import { updateProductSchema } from '@/lib/validation/product';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }
    
    const products = await productService.findProductsWithVariants(id);
    const product = products[0];
    
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Parse JSON fields
    const enhancedProduct = {
      ...product,
      keywords: product.keywords ? JSON.parse(product.keywords) : [],
      metadata: product.metadata ? JSON.parse(product.metadata) : {},
      variants: product.variants.map(variant => ({
        ...variant,
        attributes: variant.attributes ? JSON.parse(variant.attributes) : {},
        keywords: variant.keywords ? JSON.parse(variant.keywords) : [],
      })),
    };
    
    return NextResponse.json({
      success: true,
      data: enhancedProduct,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }
    
    // Validate request body
    const validatedData = updateProductSchema.parse(body);
    
    // Update the product
    const product = await productService.updateProduct(id, validatedData);
    
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product data',
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
        error: 'Failed to update product',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }
    
    // Deactivate the product instead of hard delete
    const success = await productService.deactivateProduct(id);
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating product:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deactivate product',
      },
      { status: 500 }
    );
  }
}