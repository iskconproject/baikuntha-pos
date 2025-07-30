import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services/database/products';
import { z } from 'zod';

const stockUpdateSchema = z.object({
  updates: z.array(z.object({
    variantId: z.string(),
    quantity: z.number().min(0),
    operation: z.enum(['set', 'add', 'subtract']).default('set'),
    reason: z.string().optional(),
  })),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = stockUpdateSchema.parse(body);
    
    // Process stock updates
    const results = [];
    
    for (const update of validatedData.updates) {
      try {
        let newQuantity = update.quantity;
        
        if (update.operation !== 'set') {
          // Get current stock for add/subtract operations
          const variant = await productService.findVariantById(update.variantId);
          if (!variant) {
            results.push({
              variantId: update.variantId,
              success: false,
              error: 'Variant not found',
            });
            continue;
          }
          
          const currentStock = variant.stockQuantity || 0;
          
          if (update.operation === 'add') {
            newQuantity = currentStock + update.quantity;
          } else if (update.operation === 'subtract') {
            newQuantity = Math.max(0, currentStock - update.quantity);
          }
        }
        
        // Update the stock
        const success = await productService.updateVariantStock(update.variantId, newQuantity);
        
        results.push({
          variantId: update.variantId,
          success,
          newQuantity,
          operation: update.operation,
          reason: update.reason,
        });
      } catch (error) {
        console.error(`Error updating stock for variant ${update.variantId}:`, error);
        results.push({
          variantId: update.variantId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return NextResponse.json({
      success: true,
      message: `Stock updated for ${successCount} items${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
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
    const threshold = parseInt(searchParams.get('threshold') || '5');
    const includeVariants = searchParams.get('includeVariants') !== 'false';
    
    // Get low stock items
    const lowStockItems = await productService.getLowStockItems({
      threshold,
      includeVariants,
    });
    
    return NextResponse.json({
      success: true,
      data: lowStockItems,
      threshold,
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch low stock items',
      },
      { status: 500 }
    );
  }
}