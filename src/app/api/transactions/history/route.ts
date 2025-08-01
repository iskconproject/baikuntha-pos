import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/services/database/transactions';
import { verifySession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get('baikuntha-session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }
    
    // Verify session
    const session = await verifySession(sessionToken);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Build filters
    const filters: any = {};
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          filters.endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filters.startDate = startDate;
    }
    
    if (paymentMethod !== 'all') {
      filters.paymentMethod = paymentMethod;
    }
    
    // For cashiers, only show their own transactions
    if (session.role === 'cashier') {
      filters.userId = session.userId;
    }
    
    const result = await transactionService.getTransactionHistory({
      ...filters,
      limit,
      offset,
    });
    
    return NextResponse.json({
      success: true,
      data: result.transactions,
      totalCount: result.totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}