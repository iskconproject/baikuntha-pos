import { NextRequest, NextResponse } from 'next/server';
import { receiptService } from '@/services/printer/receiptService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    
    // Mock transaction data for testing
    const mockTransaction = {
      id: transactionId,
      userId: 'test-user',
      subtotal: 500,
      tax: 0,
      discount: 0,
      total: 500,
      paymentMethod: 'cash',
      paymentReference: `CASH-${Date.now()}`,
      status: 'completed',
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: 250,
          totalPrice: 500,
          product: { name: 'Bhagavad Gita' }
        }
      ]
    };

    const mockCashier = {
      id: 'user-1',
      username: 'cashier1'
    };

    const receiptData = receiptService.generateReceiptData(
      mockTransaction,
      mockCashier,
      500
    );
    
    return NextResponse.json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    console.error('Receipt API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}