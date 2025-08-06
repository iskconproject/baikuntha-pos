import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { scheduledReportsService } from '@/services/database/scheduledReports';

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

    // Check if user has permission to view scheduled reports (admin or manager)
    if (!['admin', 'manager'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to access scheduled reports' },
        { status: 403 }
      );
    }

    const reports = await scheduledReportsService.findAll();

    return NextResponse.json({
      success: true,
      data: reports.map(report => ({
        ...report,
        recipients: JSON.parse(report.recipients || '[]'),
        filters: JSON.parse(report.filters || '{}'),
      })),
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Check if user has permission to create scheduled reports (admin or manager)
    if (!['admin', 'manager'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create scheduled reports' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, reportType, frequency, format, recipients = [], filters = {} } = body;

    // Validate required fields
    if (!name || !reportType || !frequency || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate report type
    if (!['daily-sales', 'transactions', 'products', 'analytics'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // Validate frequency
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + 1)); // Next Monday
        nextRun.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1, 1); // First day of next month
        nextRun.setHours(9, 0, 0, 0);
        break;
    }

    const report = await scheduledReportsService.create({
      id: scheduledReportsService.generateId(),
      name,
      reportType,
      frequency,
      format,
      recipients: JSON.stringify(recipients),
      filters: JSON.stringify(filters),
      isActive: true,
      nextRun,
      createdBy: authResult.user.id,
    });

    return NextResponse.json({
      success: true,
      data: { id: report.id },
    });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}