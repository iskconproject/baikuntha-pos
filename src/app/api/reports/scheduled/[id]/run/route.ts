import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { getDb } from '@/lib/db/connection';
import { scheduledReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { reportService } from '@/services/reports/reportService';
import { ReportExportService } from '@/services/reports/exportService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Check if user has permission to run scheduled reports (admin or manager)
    if (!['admin', 'manager'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run scheduled reports' },
        { status: 403 }
      );
    }

    const { id } = params;
    const db = getDb();
    
    // Get the scheduled report
    const report = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    const scheduledReport = report[0];
    const filters = JSON.parse(scheduledReport.filters || '{}');

    // Parse date filters
    const parsedFilters: any = { ...filters };
    if (filters.startDate) {
      parsedFilters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      parsedFilters.endDate = new Date(filters.endDate);
    }

    // Generate the report data
    let reportData;
    switch (scheduledReport.reportType) {
      case 'daily-sales':
        const date = parsedFilters.startDate || new Date();
        reportData = await reportService.getDailySalesReport(date);
        break;
      case 'transactions':
        const { transactions } = await reportService.getTransactionHistory(parsedFilters, 1000, 0);
        reportData = transactions;
        break;
      case 'products':
        reportData = await reportService.getProductPerformanceReport(parsedFilters);
        break;
      case 'analytics':
        reportData = await reportService.getSalesAnalytics(parsedFilters);
        break;
      default:
        throw new Error(`Unknown report type: ${scheduledReport.reportType}`);
    }

    // Update last run time
    await db
      .update(scheduledReports)
      .set({ 
        lastRun: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, id));

    // In a real implementation, you would queue this for background processing
    // and potentially send emails to recipients
    console.log(`Report ${scheduledReport.name} executed successfully`);
    console.log(`Report data:`, reportData);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Report executed successfully',
        reportName: scheduledReport.name,
        executedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error running scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled report' },
      { status: 500 }
    );
  }
}