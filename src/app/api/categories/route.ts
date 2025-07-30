import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/services/database/categories';
import { createCategorySchema } from '@/lib/validation/category';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHierarchy = searchParams.get('hierarchy') === 'true';
    
    if (includeHierarchy) {
      // Get categories with hierarchy
      const categoryHierarchy = await categoryService.getCategoryHierarchy({
        maxDepth: 5,
        includeProductCount: true,
        activeOnly: true,
      });
      
      return NextResponse.json({
        categories: categoryHierarchy,
        success: true,
      });
    } else {
      // Get flat list of categories
      const allCategories = await categoryService.findActiveCategories();
      
      return NextResponse.json({
        categories: allCategories,
        success: true,
      });
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch categories' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createCategorySchema.parse(body);
    
    // Create the category
    const category = await categoryService.createCategoryWithValidation(validatedData);
    
    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    
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
        error: 'Failed to create category',
      },
      { status: 500 }
    );
  }
}