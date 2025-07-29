import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/services/reports/reportService';
import { ReportExportService, CSVExporter, PDFExporter } from '@/services/reports/exportService';
import { verifyAuth } from '@/lib/auth/middleware';
import { parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to export reports
    if (authResult.user.role === 'cashier') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reportType, format, filters = {} } = body;

    // Validate required parameters
    if (!reportType || !format) {
      return NextResponse.json(
        { error: 'Report type and format are required' },
        { status: 400 }
      );
    }

    if (!['daily-sales', 'transactions', 'products'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv or pdf' },
        { status: 400 }
      );
    }

    // Parse date filters
    const parsedFilters: any = { ...filters };
    if (filters.startDate) {
      parsedFilters.startDate = parseISO(filters.startDate);
    }
    if (filters.endDate) {
      parsedFilters.endDate = parseISO(filters.endDate);
    }

    // Get export data
    const exportData = await reportService.getExportData(reportType, parsedFilters);
    
    if (!exportData || exportData.length === 0) {
      return NextResponse.json(
        { error: 'No data available for export' },
        { status: 404 }
      );
    }

    // Format data for better readability
    const formattedData = ReportExportService.formatExportData(exportData, reportType);

    if (format === 'csv') {
      // Generate CSV
      const csvContent = CSVExporter.arrayToCSV(formattedData);
      const filename = ReportExportService.generateFilename(
        reportType,
        parsedFilters.startDate,
        parsedFilters.endDate
      );

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // Generate HTML for PDF
      const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
      const htmlContent = PDFExporter.generateHTMLTable(formattedData, title);

      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="${title}.html"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}