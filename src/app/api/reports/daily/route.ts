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
    const dateParam = searchParams.get('date');
    
    // Default to today if no date provided
    const date = dateParam ? new Date(dateParam) : new Date();
    
    // Validate date
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const report = await reportService.getDailySalesReport(date);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error in daily report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
}