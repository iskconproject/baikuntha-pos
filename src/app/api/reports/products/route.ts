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
    const categoryId = searchParams.get('categoryId') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const reportType = searchParams.get('type') || 'performance'; // 'performance' or 'top-selling'
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

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    const filters = {
      startDate,
      endDate,
      categoryId,
      productId,
    };

    let data;
    if (reportType === 'top-selling') {
      data = await reportService.getTopSellingProducts(filters, limit);
    } else {
      data = await reportService.getProductPerformanceReport(filters);
      // Apply limit to performance report
      data = data.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data,
      reportType,
    });
  } catch (error) {
    console.error('Error in product report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate product report' },
      { status: 500 }
    );
  }
}