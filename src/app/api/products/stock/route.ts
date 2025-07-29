import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services/database/products';
import { stockUpdateSchema, bulkStockUpdateSchema, lowStockAlertSchema } from '@/lib/validation/product';
import { z } from 'zod';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a bulk update or single update
    if (Array.isArray(body.updates)) {
      // Bulk update
      const validatedData = bulkStockUpdateSchema.parse(body);
      const success = await productService.bulkUpdateStock(validatedData.updates);
      
      return NextResponse.json({
        success,
        message: success ? 'Stock updated successfully' : 'Failed to update stock',
      });
    } else {
      // Single update
      const validatedData = stockUpdateSchema.parse(body);
      
      let newQuantity = validatedData.quantity;
      
      if (validatedData.operation !== 'set') {
        const variant = await productService.findVariantById(validatedData.variantId);
        if (!variant) {
          return NextResponse.json(
            {
              success: false,
              error: 'Product variant not found',
            },
            { status: 404 }
          );
        }
        
        if (validatedData.operation === 'add') {
          newQuantity = (variant.stockQuantity || 0) + validatedData.quantity;
        } else if (validatedData.operation === 'subtract') {
          newQuantity = Math.max(0, (variant.stockQuantity || 0) - validatedData.quantity);
        }
      }
      
      const success = await productService.updateVariantStock(
        validatedData.variantId,
        newQuantity
      );
      
      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update stock',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Stock updated successfully',
      });
    }
  } catch (error) {
    console.error('Error updating stock:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid stock update data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update stock',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'low-stock') {
      // Get low stock items
      const queryParams = Object.fromEntries(searchParams.entries());
      const validatedQuery = lowStockAlertSchema.parse(queryParams);
      
      const lowStockItems = await productService.getLowStockItems(validatedQuery);
      
      return NextResponse.json({
        success: true,
        data: lowStockItems,
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action parameter',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching stock data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock data',
      },
      { status: 500 }
    );
  }
}