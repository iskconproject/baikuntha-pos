/**
 * Service Worker for background sync functionality
 */

const SYNC_TAG = 'background-sync';
const CACHE_NAME = 'vaikunthapos-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Sync service worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Sync service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(performBackgroundSync());
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'REGISTER_SYNC':
      registerBackgroundSync();
      break;
    case 'FORCE_SYNC':
      performBackgroundSync().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
    case 'GET_SYNC_STATUS':
      getSyncStatus().then((status) => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Register background sync
async function registerBackgroundSync() {
  try {
    await self.registration.sync.register(SYNC_TAG);
    console.log('Background sync registered');
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

// Perform background sync
async function performBackgroundSync() {
  console.log('Performing background sync...');
  
  try {
    // Check if we're online
    if (!navigator.onLine) {
      console.log('Offline, skipping background sync');
      return;
    }

    // Get pending operations from IndexedDB
    const pendingOps = await getPendingOperations();
    
    if (pendingOps.length === 0) {
      console.log('No pending operations to sync');
      return;
    }

    console.log(`Syncing ${pendingOps.length} pending operations`);

    // Process each operation
    for (const operation of pendingOps) {
      try {
        await processOperation(operation);
        await removePendingOperation(operation.id);
        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        await incrementRetryCount(operation.id);
      }
    }

    // Notify main thread of sync completion
    await notifyClients('SYNC_COMPLETED', { 
      processedCount: pendingOps.length 
    });

  } catch (error) {
    console.error('Background sync failed:', error);
    await notifyClients('SYNC_FAILED', { 
      error: error.message 
    });
  }
}

// Process individual operation
async function processOperation(operation) {
  const { type, tableName, data } = operation;
  
  const endpoint = getApiEndpoint(tableName, type, data);
  const method = getHttpMethod(type);
  const body = ['create', 'update'].includes(type) ? JSON.stringify(data) : undefined;

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Helper functions
function getApiEndpoint(tableName, type, data) {
  const baseEndpoints = {
    users: '/api/users',
    categories: '/api/categories',
    products: '/api/products',
    product_variants: '/api/products/variants',
    transactions: '/api/transactions',
    transaction_items: '/api/transactions/items',
  };

  const base = baseEndpoints[tableName] || `/api/${tableName}`;
  
  if (type === 'delete' || type === 'update') {
    return `${base}/${data.id}`;
  }
  
  return base;
}

function getHttpMethod(type) {
  switch (type) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'delete': return 'DELETE';
    default: return 'POST';
  }
}

// IndexedDB operations for pending sync data
async function getPendingOperations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VaikunthaPosSyncDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingOperations'], 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const store = db.createObjectStore('pendingOperations', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('retryCount', 'retryCount', { unique: false });
      }
    };
  });
}

async function removePendingOperation(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VaikunthaPosSyncDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function incrementRetryCount(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VaikunthaPosSyncDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.retryCount = (operation.retryCount || 0) + 1;
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Operation not found, might have been removed
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Notify all clients
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type, data });
  });
}

// Get sync status
async function getSyncStatus() {
  try {
    const pendingOps = await getPendingOperations();
    return {
      pendingOperations: pendingOps.length,
      isOnline: navigator.onLine,
      lastSync: new Date().toISOString()
    };
  } catch (error) {
    return {
      pendingOperations: 0,
      isOnline: navigator.onLine,
      error: error.message
    };
  }
}