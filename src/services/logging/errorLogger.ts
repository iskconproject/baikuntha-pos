import { AppError } from '@/lib/errors/AppError';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
  context?: {
    userId?: string;
    userRole?: string;
    url?: string;
    userAgent?: string;
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface ErrorLogFilter {
  level?: 'error' | 'warning' | 'info';
  resolved?: boolean;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  component?: string;
  search?: string;
}

class ErrorLoggerService {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Log an error
   */
  logError(
    error: Error | AppError,
    context?: Partial<ErrorLogEntry['context']>,
    level: 'error' | 'warning' | 'info' = 'error'
  ): string {
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level,
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError && {
          code: error.code,
          statusCode: error.statusCode,
        }),
      },
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...context,
      },
      resolved: false,
    };

    this.addLog(logEntry);

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry);
    }

    return id;
  }

  /**
   * Log a custom message
   */
  logMessage(
    message: string,
    level: 'error' | 'warning' | 'info' = 'info',
    context?: Partial<ErrorLogEntry['context']>
  ): string {
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    const logEntry: ErrorLogEntry = {
      id,
      timestamp,
      level,
      message,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...context,
      },
      resolved: false,
    };

    this.addLog(logEntry);
    return id;
  }

  /**
   * Get filtered logs
   */
  getLogs(filter: ErrorLogFilter = {}): ErrorLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter.resolved !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.resolved === filter.resolved);
    }

    if (filter.dateFrom) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.dateTo!);
    }

    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.context?.userId === filter.userId);
    }

    if (filter.component) {
      filteredLogs = filteredLogs.filter(log => log.context?.component === filter.component);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.error?.message.toLowerCase().includes(searchLower) ||
        log.context?.action?.toLowerCase().includes(searchLower)
      );
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get log by ID
   */
  getLog(id: string): ErrorLogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  /**
   * Mark log as resolved
   */
  resolveLog(id: string, resolvedBy: string, notes?: string): boolean {
    const log = this.logs.find(log => log.id === id);
    if (!log) return false;

    log.resolved = true;
    log.resolvedBy = resolvedBy;
    log.resolvedAt = new Date().toISOString();
    if (notes) log.notes = notes;

    return true;
  }

  /**
   * Delete log
   */
  deleteLog(id: string): boolean {
    const index = this.logs.findIndex(log => log.id === id);
    if (index === -1) return false;

    this.logs.splice(index, 1);
    return true;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byLevel: Record<string, number>;
    resolved: number;
    unresolved: number;
    last24Hours: number;
    last7Days: number;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.logs.length,
      byLevel,
      resolved: this.logs.filter(log => log.resolved).length,
      unresolved: this.logs.filter(log => !log.resolved).length,
      last24Hours: this.logs.filter(log => new Date(log.timestamp) > last24Hours).length,
      last7Days: this.logs.filter(log => new Date(log.timestamp) > last7Days).length,
    };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter: ErrorLogFilter = {}): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  private addLog(log: ErrorLogEntry): void {
    this.logs.unshift(log);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToExternalService(log: ErrorLogEntry): Promise<void> {
    try {
      // This would integrate with your external logging service
      // For now, we'll just log to console
      console.error('Error logged:', log);
      
      // Example: Send to external service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log),
      // });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }
}

export const errorLogger = new ErrorLoggerService();

// Convenience functions
export const logError = (error: Error | AppError, context?: Partial<ErrorLogEntry['context']>) =>
  errorLogger.logError(error, context);

export const logWarning = (error: Error | AppError, context?: Partial<ErrorLogEntry['context']>) =>
  errorLogger.logError(error, context, 'warning');

export const logInfo = (message: string, context?: Partial<ErrorLogEntry['context']>) =>
  errorLogger.logMessage(message, 'info', context);