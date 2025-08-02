import { describe, it, expect } from 'vitest';
import { AppError, ErrorTypes, createError, isAppError, normalizeError } from '@/lib/errors/AppError';

describe('AppError', () => {
  describe('AppError class', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        400,
        'User friendly message',
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.userMessage).toBe('User friendly message');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.name).toBe('AppError');
    });

    it('should create an AppError with minimal properties', () => {
      const error = new AppError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should return user message when available', () => {
      const error = new AppError('Technical error', 'TEST_ERROR', 400, 'User friendly message');
      expect(error.getUserMessage()).toBe('User friendly message');
    });

    it('should return technical message when user message not available', () => {
      const error = new AppError('Technical error', 'TEST_ERROR');
      expect(error.getUserMessage()).toBe('Technical error');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        400,
        'User message',
        { userId: '123' }
      );

      const json = error.toJSON();
      expect(json).toEqual({
        name: 'AppError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        userMessage: 'User message',
        context: { userId: '123' },
      });
    });
  });

  describe('ErrorTypes', () => {
    it('should have all required error types', () => {
      expect(ErrorTypes.INVALID_CREDENTIALS).toBeDefined();
      expect(ErrorTypes.SESSION_EXPIRED).toBeDefined();
      expect(ErrorTypes.UNAUTHORIZED).toBeDefined();
      expect(ErrorTypes.VALIDATION_ERROR).toBeDefined();
      expect(ErrorTypes.DATABASE_ERROR).toBeDefined();
      expect(ErrorTypes.NETWORK_ERROR).toBeDefined();
      expect(ErrorTypes.INSUFFICIENT_STOCK).toBeDefined();
      expect(ErrorTypes.PRINTER_ERROR).toBeDefined();
    });

    it('should have correct structure for error types', () => {
      const errorType = ErrorTypes.INVALID_CREDENTIALS;
      expect(errorType).toHaveProperty('code');
      expect(errorType).toHaveProperty('statusCode');
      expect(errorType).toHaveProperty('message');
      expect(errorType).toHaveProperty('userMessage');
    });
  });

  describe('createError', () => {
    it('should create AppError from predefined type', () => {
      const error = createError('INVALID_CREDENTIALS');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid PIN or username');
      expect(error.userMessage).toBe('The PIN you entered is incorrect. Please try again.');
    });

    it('should create AppError with custom context', () => {
      const context = { userId: '123', attempt: 3 };
      const error = createError('INVALID_CREDENTIALS', context);
      
      expect(error.context).toEqual(context);
    });

    it('should create AppError with custom user message', () => {
      const customMessage = 'Custom user message';
      const error = createError('INVALID_CREDENTIALS', undefined, customMessage);
      
      expect(error.userMessage).toBe(customMessage);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test', 'TEST');
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Test');
      expect(isAppError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe('normalizeError', () => {
    it('should return AppError as-is', () => {
      const appError = new AppError('Test', 'TEST');
      const normalized = normalizeError(appError);
      
      expect(normalized).toBe(appError);
    });

    it('should convert regular Error to AppError', () => {
      const error = new Error('Regular error');
      const normalized = normalizeError(error);
      
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('Regular error');
      expect(normalized.code).toBe('UNKNOWN_ERROR');
      expect(normalized.statusCode).toBe(500);
      expect(normalized.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('should convert unknown values to AppError', () => {
      const normalized = normalizeError('string error');
      
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('Unknown error');
      expect(normalized.code).toBe('UNKNOWN_ERROR');
      expect(normalized.statusCode).toBe(500);
      expect(normalized.userMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });
});