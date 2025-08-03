import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { getDb } from '@/lib/db/connection';
import { syncMetadata, transactions } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const db = getDb();

    // Get sync metadata
    const syncData = await db
      .select()
      .from(syncMetadata)
      .limit(1);

    // Count pending transactions (not synced)
    const pendingCount = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.syncStatus, 'pending'));

    const lastSyncTime = syncData[0]?.lastSyncAt || null;
    const pendingReports = Number(pendingCount[0]?.count || 0);

    // Simulate sync progress (in a real app, this would come from actual sync service)
    const isActive = false; // Would be determined by actual sync service
    const progress = 0; // Would be actual progress percentage

    let message = 'All reports up to date';
    if (pendingReports > 0) {
      message = `${pendingReports} transactions pending sync`;
    }
    if (isActive) {
      message = 'Syncing data...';
    }

    return NextResponse.json({
      isActive,
      progress,
      message,
      lastSyncTime,
      pendingReports,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}