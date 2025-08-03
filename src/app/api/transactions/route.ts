import { NextRequest, NextResponse } from "next/server";
import { transactionService } from "@/services/database/transactions";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
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

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    );

    const tax = body.tax || 0;
    const discount = body.discount || 0;
    const total = subtotal + tax - discount;

    // Create transaction
    const transactionData = {
      id: uuidv4(),
      userId: "test-user", // In real app, get from auth
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      status: "completed" as const,
      syncStatus: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const transaction = await transactionService.createTransaction({
      ...transactionData,
      items: body.items,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Transaction API error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
