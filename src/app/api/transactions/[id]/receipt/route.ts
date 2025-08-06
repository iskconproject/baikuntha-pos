import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { transactionService } from '@/services/database/transactions';
import type { ReceiptData } from '@/types/receipt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const transactionId = params.id;

    // Get transaction with full product details
    const transactionWithItems = await transactionService.findTransactionWithItems(transactionId);

    if (!transactionWithItems) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Generate receipt data
    const receiptData: ReceiptData = {
      id: `receipt-${transactionWithItems.id}`,
      transactionId: transactionWithItems.id,
      receiptNumber: transactionWithItems.id,
      storeName: "ISKCON Asansol Temple",
      storeAddress: "Gift & Book Store",
      storePhone: "+91-XXXXXXXXXX",
      storeEmail: "store@iskconasansol.org",
      cashier: {
        id: transactionWithItems.userId,
        username: user.username, // Use the current user's username
      },
      timestamp: transactionWithItems.createdAt,
      items: transactionWithItems.items.map(item => ({
        name: item.variant?.name 
          ? `${item.product.name} - ${item.variant.name}`
          : item.product.name,
        variant: item.variant?.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: transactionWithItems.subtotal,
      tax: transactionWithItems.tax || 0,
      discount: transactionWithItems.discount || 0,
      total: transactionWithItems.total,
      paymentMethod: transactionWithItems.paymentMethod,
      paymentReference: transactionWithItems.paymentReference || undefined,
      footer: "Thank you for your visit!\nHare Krishna!",
    };

    return NextResponse.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    console.error('Receipt generation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}