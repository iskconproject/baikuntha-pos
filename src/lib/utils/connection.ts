/**
 * Connection monitoring and offline detection utilities
 */
import React from 'react';

export interface ConnectionStatus {
  isOnline: boolean;
  connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
}

export class ConnectionMonitor {
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private currentStatus: ConnectionStatus = { isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true };
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    // Only setup event listeners in browser environment
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.startPeriodicCheck();
    }
  }

  private setupEventListeners() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Basic online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleConnectionChange);
    }
  }

  private handleOnline = () => {
    this.updateStatus({ isOnline: true });
  };

  private handleOffline = () => {
    this.updateStatus({ isOnline: false });
  };

  private handleConnectionChange = () => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateStatus({
        isOnline: navigator.onLine,
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    }
  };

  private updateStatus(newStatus: Partial<ConnectionStatus>) {
    const previousStatus = { ...this.currentStatus };
    this.currentStatus = { ...this.currentStatus, ...newStatus };

    // Only notify if status actually changed
    if (previousStatus.isOnline !== this.currentStatus.isOnline) {
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  private startPeriodicCheck() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Check connection every 30 seconds by attempting to fetch a small resource
    this.checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!this.currentStatus.isOnline && response.ok) {
          this.updateStatus({ isOnline: true });
        }
      } catch (error) {
        if (this.currentStatus.isOnline) {
          this.updateStatus({ isOnline: false });
        }
      }
    }, 30000);
  }

  public getStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  public isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  public subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    listener(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.listeners.clear();
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor();

// React hook for connection status
export function useConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    connectionMonitor.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = connectionMonitor.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Utility functions
export function isOnline(): boolean {
  return connectionMonitor.isOnline();
}

export function waitForConnection(timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connectionMonitor.isOnline()) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error('Connection timeout'));
    }, timeout);

    const unsubscribe = connectionMonitor.subscribe((status) => {
      if (status.isOnline) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });
  });
}