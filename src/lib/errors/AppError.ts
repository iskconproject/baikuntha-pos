/**
 * Custom application error class with user-friendly messages
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * Get user-friendly message for display
   */
  getUserMessage(): string {
    return this.userMessage || this.message;
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      context: this.context,
    };
  }
}

/**
 * Predefined error types with user-friendly messages
 */
export const ErrorTypes = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    statusCode: 401,
    message: 'Invalid PIN or username',
    userMessage: 'The PIN you entered is incorrect. Please try again.',
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    statusCode: 401,
    message: 'Session has expired',
    userMessage: 'Your session has expired. Please log in again.',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    statusCode: 403,
    message: 'Insufficient permissions',
    userMessage: 'You don\'t have permission to perform this action.',
  },

  // Validation errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    statusCode: 400,
    message: 'Validation failed',
    userMessage: 'Please check your input and try again.',
  },
  REQUIRED_FIELD: {
    code: 'REQUIRED_FIELD',
    statusCode: 400,
    message: 'Required field missing',
    userMessage: 'This field is required.',
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    statusCode: 400,
    message: 'Invalid format',
    userMessage: 'Please enter a valid value.',
  },

  // Database errors
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    statusCode: 500,
    message: 'Database operation failed',
    userMessage: 'Something went wrong. Please try again.',
  },
  RECORD_NOT_FOUND: {
    code: 'RECORD_NOT_FOUND',
    statusCode: 404,
    message: 'Record not found',
    userMessage: 'The requested item could not be found.',
  },
  DUPLICATE_ENTRY: {
    code: 'DUPLICATE_ENTRY',
    statusCode: 409,
    message: 'Duplicate entry',
    userMessage: 'This item already exists.',
  },

  // Network errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    statusCode: 503,
    message: 'Network connection failed',
    userMessage: 'Unable to connect. Please check your internet connection.',
  },
  SYNC_ERROR: {
    code: 'SYNC_ERROR',
    statusCode: 503,
    message: 'Synchronization failed',
    userMessage: 'Failed to sync data. Your changes are saved locally.',
  },

  // Business logic errors
  INSUFFICIENT_STOCK: {
    code: 'INSUFFICIENT_STOCK',
    statusCode: 400,
    message: 'Insufficient stock',
    userMessage: 'Not enough items in stock.',
  },
  INVALID_TRANSACTION: {
    code: 'INVALID_TRANSACTION',
    statusCode: 400,
    message: 'Invalid transaction',
    userMessage: 'This transaction cannot be processed.',
  },

  // Hardware errors
  PRINTER_ERROR: {
    code: 'PRINTER_ERROR',
    statusCode: 503,
    message: 'Printer connection failed',
    userMessage: 'Unable to connect to printer. Receipt saved for later printing.',
  },
} as const;

/**
 * Create an AppError from a predefined type
 */
export function createError(
  type: keyof typeof ErrorTypes,
  context?: Record<string, any>,
  customMessage?: string
): AppError {
  const errorType = ErrorTypes[type];
  return new AppError(
    errorType.message,
    errorType.code,
    errorType.statusCode,
    customMessage || errorType.userMessage,
    context
  );
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      'An unexpected error occurred. Please try again.'
    );
  }

  return new AppError(
    'Unknown error',
    'UNKNOWN_ERROR',
    500,
    'An unexpected error occurred. Please try again.'
  );
}