import { NextRequest, NextResponse } from "next/server";
import { transactionService } from "@/services/database/transactions";
import { getSessionUser } from "@/lib/auth/session";
import { productService } from "@/services/database/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Validate that all products and variants exist
    for (const item of body.items) {
      if (!item.productId) {
        return NextResponse.json(
          { error: "Product ID is required for all items" },
          { status: 400 }
        );
      }

      // Check if product exists
      const product = await productService.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${item.productId} not found` },
          { status: 400 }
        );
      }

      // Check if variant exists (if specified and not custom)
      if (item.variantId && !item.isCustomVariant) {
        const variant = await productService.findVariantById(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          return NextResponse.json(
            { error: `Variant with ID ${item.variantId} not found or doesn't belong to product ${item.productId}` },
            { status: 400 }
          );
        }
      }

      // Validate custom variant data
      if (item.isCustomVariant) {
        if (!item.customVariantData || !item.customVariantData.customPrice) {
          return NextResponse.json(
            { error: "Custom variant data with price is required for custom variants" },
            { status: 400 }
          );
        }

        if (item.customVariantData.customPrice <= 0) {
          return NextResponse.json(
            { error: "Custom variant price must be greater than 0" },
            { status: 400 }
          );
        }

        if (item.customVariantData.customPrice > 100000) {
          return NextResponse.json(
            { error: "Custom variant price cannot exceed ₹1,00,000" },
            { status: 400 }
          );
        }
      }

      // Validate quantity and price
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }

      if (!item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: "Unit price must be greater than 0" },
          { status: 400 }
        );
      }
    }

    // Create transaction
    const transaction = await transactionService.createTransaction({
      userId: user.id,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      tax: body.tax || 0,
      discount: body.discount || 0,
      items: body.items,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Transaction API error:", error);
    
    // Handle specific database constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return NextResponse.json(
          { error: "Database constraint violation. Please check that all referenced products and variants exist." },
          { status: 400 }
        );
      }
    }

    // Handle other common errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
