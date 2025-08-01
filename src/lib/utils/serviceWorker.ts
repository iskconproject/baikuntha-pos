/**
 * Service Worker integration for background sync
 */
import React from 'react';

// Type definitions for Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

export interface ServiceWorkerSyncStatus {
  pendingOperations: number;
  isOnline: boolean;
  lastSync?: string;
  error?: string;
}

export class ServiceWorkerSync {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Set<(status: ServiceWorkerSyncStatus) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        // Register the sync service worker
        this.registration = await navigator.serviceWorker.register('/sw-sync.js', {
          scope: '/'
        });

        console.log('Sync service worker registered:', this.registration);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

        // Register for background sync
        await this.registerBackgroundSync();

      } catch (error) {
        console.error('Failed to register sync service worker:', error);
      }
    }
  }

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_COMPLETED':
        console.log('Background sync completed:', data);
        this.notifyListeners();
        break;
      case 'SYNC_FAILED':
        console.error('Background sync failed:', data);
        this.notifyListeners();
        break;
    }
  };

  public async registerBackgroundSync(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if ('sync' in this.registration) {
      try {
        // Type assertion with proper interface
        const registration = this.registration as ServiceWorkerRegistrationWithSync;
        await registration.sync.register('background-sync');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Failed to register background sync:', error);
        throw error;
      }
    } else {
      console.warn('Background sync not supported');
    }
  }

  public async forceSync(): Promise<{ success: boolean; error?: string }> {
    if (!this.registration || !this.registration.active) {
      return { success: false, error: 'Service worker not active' };
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'FORCE_SYNC' },
        [messageChannel.port2]
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve({ success: false, error: 'Sync timeout' });
      }, 30000);
    });
  }

  public async getSyncStatus(): Promise<ServiceWorkerSyncStatus> {
    if (!this.registration || !this.registration.active) {
      return {
        pendingOperations: 0,
        isOnline: navigator.onLine,
        error: 'Service worker not active'
      };
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_SYNC_STATUS' },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        resolve({
          pendingOperations: 0,
          isOnline: navigator.onLine,
          error: 'Status request timeout'
        });
      }, 5000);
    });
  }

  public subscribe(listener: (status: ServiceWorkerSyncStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    this.getSyncStatus().then(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const status = await this.getSyncStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in service worker sync listener:', error);
      }
    });
  }

  public async addPendingOperation(operation: {
    id: string;
    type: 'create' | 'update' | 'delete';
    tableName: string;
    data: any;
    timestamp: number;
    retryCount: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BaikunthaPosSyncDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['pendingOperations'], 'readwrite');
        const store = transaction.objectStore('pendingOperations');
        
        const addRequest = store.put(operation);
        addRequest.onsuccess = () => {
          resolve();
          // Trigger background sync
          this.registerBackgroundSync().catch(console.error);
        };
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const store = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('retryCount', 'retryCount', { unique: false });
        }
      };
    });
  }

  public async clearPendingOperations(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BaikunthaPosSyncDB', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['pendingOperations'], 'readwrite');
        const store = transaction.objectStore('pendingOperations');
        
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const serviceWorkerSync = new ServiceWorkerSync();

// React hook for service worker sync status
export function useServiceWorkerSync() {
  const [status, setStatus] = React.useState<ServiceWorkerSyncStatus>({
    pendingOperations: 0,
    isOnline: navigator.onLine
  });

  React.useEffect(() => {
    const unsubscribe = serviceWorkerSync.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return {
    status,
    forceSync: () => serviceWorkerSync.forceSync(),
    clearPending: () => serviceWorkerSync.clearPendingOperations(),
  };
}