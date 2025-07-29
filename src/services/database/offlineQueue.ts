/**
 * Offline operation queue with automatic retry logic
 */
import { connectionMonitor } from '@/lib/utils/connection';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  tableName: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: number; // Higher number = higher priority
  dependencies?: string[]; // IDs of operations that must complete first
}

export interface QueueStats {
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  completedOperations: number;
}

export class OfflineQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private processing = false;
  private processingPromise: Promise<void> | null = null;
  private listeners: Set<(stats: QueueStats) => void> = new Set();
  private storageKey = 'offline_queue';

  constructor() {
    this.loadFromStorage();
    this.setupConnectionListener();
  }

  private setupConnectionListener() {
    connectionMonitor.subscribe((status) => {
      if (status.isOnline && !this.processing) {
        this.processQueue();
      }
    });
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const operations = JSON.parse(stored) as QueuedOperation[];
        operations.forEach(op => this.queue.set(op.id, op));
      }
    } catch (error) {
      console.error('Error loading offline queue from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const operations = Array.from(this.queue.values());
      localStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Error saving offline queue to storage:', error);
    }
  }

  public enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = this.generateId();
    const queuedOperation: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.set(id, queuedOperation);
    this.saveToStorage();
    this.notifyListeners();

    // Try to process immediately if online
    if (connectionMonitor.isOnline()) {
      this.processQueue();
    }

    return id;
  }

  public dequeue(id: string): boolean {
    const removed = this.queue.delete(id);
    if (removed) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return removed;
  }

  public getOperation(id: string): QueuedOperation | undefined {
    return this.queue.get(id);
  }

  public getAllOperations(): QueuedOperation[] {
    return Array.from(this.queue.values()).sort((a, b) => {
      // Sort by priority (higher first), then by timestamp (older first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  public getStats(): QueueStats {
    const operations = Array.from(this.queue.values());
    return {
      totalOperations: operations.length,
      pendingOperations: operations.filter(op => op.retryCount < op.maxRetries).length,
      failedOperations: operations.filter(op => op.retryCount >= op.maxRetries).length,
      completedOperations: 0, // Completed operations are removed from queue
    };
  }

  public async processQueue(): Promise<void> {
    if (this.processing) {
      return this.processingPromise || Promise.resolve();
    }

    this.processing = true;
    this.processingPromise = this.doProcessQueue();

    try {
      await this.processingPromise;
    } finally {
      this.processing = false;
      this.processingPromise = null;
    }
  }

  private async doProcessQueue(): Promise<void> {
    if (!connectionMonitor.isOnline()) {
      return;
    }

    const operations = this.getAllOperations();
    const processableOps = operations.filter(op => 
      op.retryCount < op.maxRetries && this.areDependenciesMet(op)
    );

    for (const operation of processableOps) {
      try {
        await this.executeOperation(operation);
        this.dequeue(operation.id);
        console.log(`Successfully processed operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
        await this.handleOperationFailure(operation, error);
      }

      // Check if we're still online after each operation
      if (!connectionMonitor.isOnline()) {
        break;
      }
    }

    this.notifyListeners();
  }

  private areDependenciesMet(operation: QueuedOperation): boolean {
    if (!operation.dependencies || operation.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies have been completed (removed from queue)
    return operation.dependencies.every(depId => !this.queue.has(depId));
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const { type, tableName, data } = operation;

    // Simulate API call based on operation type
    const endpoint = this.getApiEndpoint(tableName, type, data);
    const method = this.getHttpMethod(type);
    const body = ['create', 'update'].includes(type) ? JSON.stringify(data) : undefined;

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // For create operations, we might need to update local records with server-generated IDs
    if (type === 'create') {
      const result = await response.json();
      if (result.id && result.id !== data.id) {
        // Update local record with server ID
        await this.updateLocalRecordId(tableName, data.id, result.id);
      }
    }
  }

  private async handleOperationFailure(operation: QueuedOperation, error: unknown): Promise<void> {
    operation.retryCount++;
    
    // Calculate exponential backoff delay
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, operation.retryCount - 1), maxDelay);

    // Add some jitter to prevent thundering herd
    const jitteredDelay = delay + Math.random() * 1000;

    if (operation.retryCount < operation.maxRetries) {
      console.log(`Retrying operation ${operation.id} in ${jitteredDelay}ms (attempt ${operation.retryCount + 1}/${operation.maxRetries})`);
      
      setTimeout(() => {
        if (connectionMonitor.isOnline()) {
          this.processQueue();
        }
      }, jitteredDelay);
    } else {
      console.error(`Operation ${operation.id} failed permanently after ${operation.maxRetries} attempts:`, error);
      // Keep failed operations in queue for manual retry or inspection
    }

    this.saveToStorage();
  }

  private getApiEndpoint(tableName: string, type: string, data: any): string {
    const baseEndpoints: Record<string, string> = {
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

  private getHttpMethod(type: string): string {
    switch (type) {
      case 'create': return 'POST';
      case 'update': return 'PUT';
      case 'delete': return 'DELETE';
      default: return 'POST';
    }
  }

  private async updateLocalRecordId(tableName: string, oldId: string, newId: string): Promise<void> {
    // This would typically update the local database record
    // Implementation depends on the specific database service
    console.log(`Updating local record ID from ${oldId} to ${newId} in table ${tableName}`);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current stats
    listener(this.getStats());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const stats = this.getStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in queue stats listener:', error);
      }
    });
  }

  public clear(): void {
    this.queue.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  public retryFailed(): void {
    const operations = Array.from(this.queue.values());
    operations.forEach(op => {
      if (op.retryCount >= op.maxRetries) {
        op.retryCount = 0; // Reset retry count
      }
    });
    
    this.saveToStorage();
    this.notifyListeners();
    
    if (connectionMonitor.isOnline()) {
      this.processQueue();
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();