import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { transactionService } from '@/services/database/transactions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const dateFilter = searchParams.get('dateFilter') || 'today';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    
    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Convert date filter to actual dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    switch (dateFilter) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'all':
        // No date filter
        break;
    }

    const filters = {
      startDate,
      endDate,
      paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
      limit,
      offset,
    };

    const result = await transactionService.getTransactionHistory(filters);

    // Enhance transactions with product details
    const enhancedTransactions = await Promise.all(
      result.transactions.map(async (transaction) => {
        const transactionWithItems = await transactionService.findTransactionWithItems(transaction.id);
        
        return {
          ...transaction,
          items: transactionWithItems?.items.map(item => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            productName: item.product.name,
            variantName: item.variant?.name,
          })) || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedTransactions,
      totalCount: result.totalCount,
      page,
      limit,
      totalPages: Math.ceil(result.totalCount / limit),
    });
  } catch (error) {
    console.error('Transaction history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}