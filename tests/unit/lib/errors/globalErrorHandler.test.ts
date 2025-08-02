import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalErrorHandler } from '@/lib/errors/globalErrorHandler';
import { errorLogger } from '@/services/logging/errorLogger';

// Mock errorLogger
vi.mock('@/services/logging/errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

// Mock window object
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
});

describe('globalErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset initialization state
    globalErrorHandler.cleanup();
  });

  afterEach(() => {
    globalErrorHandler.cleanup();
  });

  describe('initialize', () => {
    it('should add event listeners for error and unhandledrejection', () => {
      globalErrorHandler.initialize();

      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should not initialize twice', () => {
      globalErrorHandler.initialize();
      globalErrorHandler.initialize();

      // Should only be called once for each event
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    });

    it('should not initialize in server environment', () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;

      globalErrorHandler.initialize();

      expect(mockAddEventListener).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners', () => {
      globalErrorHandler.initialize();
      globalErrorHandler.cleanup();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should not cleanup if not initialized', () => {
      globalErrorHandler.cleanup();

      expect(mockRemoveEventListener).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      globalErrorHandler.initialize();
    });

    it('should handle JavaScript errors', () => {
      const mockError = new Error('Test error');
      const errorEvent = new ErrorEvent('error', {
        error: mockError,
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });

      // Get the error handler function
      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      // Simulate error event
      errorHandler(errorEvent);

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          url: 'test.js',
          line: 10,
          column: 5,
          component: 'GlobalErrorHandler',
          action: 'unhandled_error',
        })
      );
    });

    it('should handle promise rejections', () => {
      const mockError = new Error('Promise rejection');
      const rejectionEvent = {
        reason: mockError,
        preventDefault: vi.fn(),
      } as any;

      // Get the rejection handler function
      const rejectionHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'unhandledrejection'
      )?.[1];

      expect(rejectionHandler).toBeDefined();

      // Simulate promise rejection event
      rejectionHandler(rejectionEvent);

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'GlobalErrorHandler',
          action: 'unhandled_promise_rejection',
        })
      );
    });

    it('should prevent default behavior in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorEvent = {
        error: new Error('Test error'),
        preventDefault: vi.fn(),
      } as any;

      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      errorHandler(errorEvent);

      expect(errorEvent.preventDefault).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not prevent default behavior in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorEvent = {
        error: new Error('Test error'),
        preventDefault: vi.fn(),
      } as any;

      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      errorHandler(errorEvent);

      expect(errorEvent.preventDefault).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('reportError', () => {
    it('should manually report an error', () => {
      const testError = new Error('Manual error');
      const context = { userId: '123', customAction: 'test-action' };

      // Mock the logError to return a log ID
      (errorLogger.logError as any).mockReturnValue('mock-log-id');

      const logId = globalErrorHandler.reportError(testError, context);

      expect(logId).toBeDefined();
      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          userId: '123',
          customAction: 'test-action',
          component: 'ManualReport',
          action: 'manual_error_report',
        })
      );
    });

    it('should report error without context', () => {
      const testError = new Error('Manual error');

      globalErrorHandler.reportError(testError);

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'ManualReport',
          action: 'manual_error_report',
        })
      );
    });
  });
});