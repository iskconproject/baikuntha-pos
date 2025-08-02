import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorLogger, logError, logWarning, logInfo } from '@/services/logging/errorLogger';
import { AppError } from '@/lib/errors/AppError';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock window and navigator
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/test' },
  writable: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true,
});

describe('errorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorLogger.clearLogs();
  });

  afterEach(() => {
    mockConsoleError.mockClear();
  });

  describe('logError', () => {
    it('should log an error with all properties', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test-action' };
      
      const logId = errorLogger.logError(error, context);

      expect(logId).toBeDefined();
      expect(typeof logId).toBe('string');

      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        id: logId,
        level: 'error',
        message: 'Test error',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
        context: {
          userId: '123',
          action: 'test-action',
          url: 'http://localhost:3000/test',
          userAgent: 'Mozilla/5.0 (Test Browser)',
        },
        resolved: false,
      });
    });

    it('should log AppError with additional properties', () => {
      const appError = new AppError('App error', 'TEST_ERROR', 400, 'User message');
      
      const logId = errorLogger.logError(appError);

      const logs = errorLogger.getLogs();
      expect(logs[0].error).toMatchObject({
        name: 'AppError',
        message: 'App error',
        code: 'TEST_ERROR',
        statusCode: 400,
      });
    });

    it('should log with different levels', () => {
      const error = new Error('Warning error');
      
      errorLogger.logError(error, undefined, 'warning');

      const logs = errorLogger.getLogs();
      expect(logs[0].level).toBe('warning');
    });
  });

  describe('logMessage', () => {
    it('should log a custom message', () => {
      const logId = errorLogger.logMessage('Custom info message', 'info', { component: 'TestComponent' });

      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        id: logId,
        level: 'info',
        message: 'Custom info message',
        context: {
          component: 'TestComponent',
        },
        resolved: false,
      });
      expect(logs[0].error).toBeUndefined();
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      errorLogger.logError(new Error('Error 1'), { userId: '1' });
      errorLogger.logError(new Error('Error 2'), { userId: '2' }, 'warning');
      errorLogger.logMessage('Info message', 'info');
    });

    it('should return all logs by default', () => {
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter by level', () => {
      const errorLogs = errorLogger.getLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');

      const warningLogs = errorLogger.getLogs({ level: 'warning' });
      expect(warningLogs).toHaveLength(1);
      expect(warningLogs[0].level).toBe('warning');
    });

    it('should filter by resolved status', () => {
      const logs = errorLogger.getLogs();
      errorLogger.resolveLog(logs[0].id, 'admin');

      const unresolvedLogs = errorLogger.getLogs({ resolved: false });
      expect(unresolvedLogs).toHaveLength(2);

      const resolvedLogs = errorLogger.getLogs({ resolved: true });
      expect(resolvedLogs).toHaveLength(1);
    });

    it('should filter by userId', () => {
      const userLogs = errorLogger.getLogs({ userId: '1' });
      expect(userLogs).toHaveLength(1);
      expect(userLogs[0].context?.userId).toBe('1');
    });

    it('should filter by search term', () => {
      const searchLogs = errorLogger.getLogs({ search: 'Error 1' });
      expect(searchLogs).toHaveLength(1);
      expect(searchLogs[0].message).toBe('Error 1');
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const todayLogs = errorLogger.getLogs({
        dateFrom: yesterday.toISOString(),
        dateTo: tomorrow.toISOString(),
      });
      expect(todayLogs).toHaveLength(3);

      const futureLogs = errorLogger.getLogs({
        dateFrom: tomorrow.toISOString(),
      });
      expect(futureLogs).toHaveLength(0);
    });

    it('should return logs sorted by timestamp (newest first)', () => {
      const logs = errorLogger.getLogs();
      expect(logs[0].message).toBe('Info message'); // Most recent
      expect(logs[2].message).toBe('Error 1'); // Oldest
    });
  });

  describe('getLog', () => {
    it('should return specific log by id', () => {
      const logId = errorLogger.logError(new Error('Specific error'));
      
      const log = errorLogger.getLog(logId);
      expect(log).toBeDefined();
      expect(log?.id).toBe(logId);
      expect(log?.message).toBe('Specific error');
    });

    it('should return undefined for non-existent id', () => {
      const log = errorLogger.getLog('non-existent-id');
      expect(log).toBeUndefined();
    });
  });

  describe('resolveLog', () => {
    it('should mark log as resolved', () => {
      const logId = errorLogger.logError(new Error('Resolvable error'));
      
      const success = errorLogger.resolveLog(logId, 'admin', 'Fixed the issue');
      expect(success).toBe(true);

      const log = errorLogger.getLog(logId);
      expect(log?.resolved).toBe(true);
      expect(log?.resolvedBy).toBe('admin');
      expect(log?.notes).toBe('Fixed the issue');
      expect(log?.resolvedAt).toBeDefined();
    });

    it('should return false for non-existent log', () => {
      const success = errorLogger.resolveLog('non-existent-id', 'admin');
      expect(success).toBe(false);
    });
  });

  describe('deleteLog', () => {
    it('should delete log by id', () => {
      const logId = errorLogger.logError(new Error('Deletable error'));
      
      expect(errorLogger.getLogs()).toHaveLength(1);
      
      const success = errorLogger.deleteLog(logId);
      expect(success).toBe(true);
      expect(errorLogger.getLogs()).toHaveLength(0);
    });

    it('should return false for non-existent log', () => {
      const success = errorLogger.deleteLog('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      errorLogger.logError(new Error('Error 1'));
      errorLogger.logError(new Error('Error 2'));
      
      expect(errorLogger.getLogs()).toHaveLength(2);
      
      errorLogger.clearLogs();
      expect(errorLogger.getLogs()).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      errorLogger.logError(new Error('Error 1'));
      errorLogger.logError(new Error('Error 2'), undefined, 'warning');
      errorLogger.logMessage('Info message', 'info');
      
      const logs = errorLogger.getLogs();
      errorLogger.resolveLog(logs[0].id, 'admin');
    });

    it('should return correct statistics', () => {
      const stats = errorLogger.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byLevel).toEqual({
        error: 1,
        warning: 1,
        info: 1,
      });
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(2);
      expect(stats.last24Hours).toBe(3);
      expect(stats.last7Days).toBe(3);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON string', () => {
      errorLogger.logError(new Error('Export test'));
      
      const exported = errorLogger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Export test');
    });

    it('should export filtered logs', () => {
      errorLogger.logError(new Error('Error log'));
      errorLogger.logMessage('Info log', 'info');
      
      const exported = errorLogger.exportLogs({ level: 'error' });
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].level).toBe('error');
    });
  });

  describe('convenience functions', () => {
    it('should use logError function', () => {
      const error = new Error('Convenience error');
      const logId = logError(error, { component: 'TestComponent' });
      
      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe(logId);
      expect(logs[0].level).toBe('error');
    });

    it('should use logWarning function', () => {
      const error = new Error('Convenience warning');
      const logId = logWarning(error);
      
      const logs = errorLogger.getLogs();
      expect(logs[0].level).toBe('warning');
    });

    it('should use logInfo function', () => {
      const logId = logInfo('Convenience info message');
      
      const logs = errorLogger.getLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Convenience info message');
    });
  });
});