import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/services/reports/reportService';
import { verifyAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Check if user has permission to view reports (manager or admin)
    if (!['admin', 'manager'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to access reports' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const userId = searchParams.get('userId') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start date format' },
        { status: 400 }
      );
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid end date format' },
        { status: 400 }
      );
    }

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const filters = {
      startDate,
      endDate,
      userId,
      paymentMethod,
    };

    const result = await reportService.getTransactionHistory(filters, limit, offset);

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions,
        totalCount: result.totalCount,
        page,
        limit,
        totalPages: Math.ceil(result.totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error in transaction history API:', error);
    return NextResponse.json(
      { error: 'Failed to get transaction history' },
      { status: 500 }
    );
  }
}