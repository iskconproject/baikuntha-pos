import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/services/database/categories';
import { updateCategorySchema } from '@/lib/validation/category';
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
          error: 'Invalid category ID format',
        },
        { status: 400 }
      );
    }
    
    const category = await categoryService.findById(id);
    
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }
    
    // Parse JSON fields
    const enhancedCategory = {
      ...category,
      keywords: category.keywords ? JSON.parse(category.keywords) : [],
    };
    
    return NextResponse.json({
      success: true,
      data: enhancedCategory,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch category',
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
          error: 'Invalid category ID format',
        },
        { status: 400 }
      );
    }
    
    // Validate request body
    const validatedData = updateCategorySchema.parse(body);
    
    // Update the category
    const category = await categoryService.updateCategoryWithValidation(id, validatedData);
    
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category data',
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
        error: 'Failed to update category',
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
          error: 'Invalid category ID format',
        },
        { status: 400 }
      );
    }
    
    // Deactivate the category instead of hard delete
    const success = await categoryService.deactivateCategory(id);
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found or has active subcategories',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating category:', error);
    
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
        error: 'Failed to deactivate category',
      },
      { status: 500 }
    );
  }
}