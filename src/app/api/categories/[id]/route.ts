import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic import to avoid build-time issues
    const { categoryService } = await import("@/services/database/categories");

    const categoryId = params.id;
    const category = await categoryService.findById(categoryId);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch category",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic imports to avoid build-time issues
    const [categoryModule, validationModule] = await Promise.all([
      import("@/services/database/categories"),
      import("@/lib/validation/category"),
    ]);

    const { categoryService } = categoryModule;
    const { updateCategorySchema } = validationModule;

    const categoryId = params.id;
    const body = await request.json();

    // Validate request body
    const validatedData = updateCategorySchema.parse(body);

    // Update the category
    const updatedCategory = await categoryService.updateCategoryWithValidation(
      categoryId,
      validatedData
    );

    if (!updatedCategory) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid category data",
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
        error: "Failed to update category",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic import to avoid build-time issues
    const { categoryService } = await import("@/services/database/categories");

    const categoryId = params.id;

    // Check if category exists
    const category = await categoryService.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found",
        },
        { status: 404 }
      );
    }

    // Deactivate the category
    const success = await categoryService.deactivateCategory(categoryId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete category",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);

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
        error: "Failed to delete category",
      },
      { status: 500 }
    );
  }
}
