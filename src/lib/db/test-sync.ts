/**
 * Simple sync test utility
 */

import { syncService } from '@/services/database/sync';
import { testConnection } from './connection';

export async function testSyncImplementation() {
  console.log('[SYNC] Testing sync implementation...');
  
  try {
    // 1. Test cloud connection
    console.log('1. Testing cloud connection...');
    const cloudConnected = await testConnection();
    console.log(`   Cloud connection: ${cloudConnected ? '[SUCCESS] Connected' : '[FAILED] Failed'}`);
    
    if (!cloudConnected) {
      console.log('   Skipping sync tests - cloud not available');
      return false;
    }
    
    // 2. Test sync status
    console.log('2. Testing sync status...');
    const syncStatuses = await syncService.getAllSyncStatuses();
    console.log(`   Sync metadata records: ${syncStatuses.length}`);
    
    // 3. Test manual sync trigger
    console.log('3. Testing manual sync...');
    const syncResult = await syncService.performFullSync();
    console.log(`   Sync result:`, {
      success: syncResult.success,
      tablesProcessed: syncResult.tablesProcessed,
      recordsSynced: syncResult.recordsSynced,
      conflicts: syncResult.conflicts,
      errors: syncResult.errors.length
    });
    
    // 4. Test sync listeners
    console.log('4. Testing sync listeners...');
    let statusReceived = false;
    const unsubscribe = syncService.subscribeSyncStatus((status) => {
      console.log(`   Status update:`, {
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        pendingOperations: status.pendingOperations
      });
      statusReceived = true;
    });
    
    // Wait a moment for status
    await new Promise(resolve => setTimeout(resolve, 100));
    unsubscribe();
    
    console.log(`   Status listener: ${statusReceived ? '[SUCCESS] Working' : '[FAILED] Failed'}`);
    
    console.log('[SUCCESS] Sync implementation test completed');
    return true;
    
  } catch (error) {
    console.error('[ERROR] Sync test failed:', error);
    return false;
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).testSync = testSyncImplementation;
}