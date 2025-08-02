import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorTypes, normalizeError } from './AppError';
import { errorLogger } from '@/services/logging/errorLogger';

/**
 * API error handler for consistent error responses
 */
export function handleApiError(error: unknown, request: NextRequest): NextResponse {
  const normalizedError = normalizeError(error);
  
  // Log the error
  errorLogger.logError(normalizedError, {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    component: 'APIErrorHandler',
    action: 'api_error',
  });

  // Return appropriate error response
  if (normalizedError instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: normalizedError.code,
          message: normalizedError.getUserMessage(),
          statusCode: normalizedError.statusCode,
        },
      },
      { status: normalizedError.statusCode }
    );
  }

  // Generic server error
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        statusCode: 500,
      },
    },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

/**
 * Validate request body and throw appropriate errors
 */
export function validateRequestBody(body: any, requiredFields: string[]): void {
  if (!body) {
    throw new AppError(
      'Request body is required',
      ErrorTypes.VALIDATION_ERROR.code,
      400,
      'Request data is missing'
    );
  }

  const missingFields = requiredFields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      ErrorTypes.VALIDATION_ERROR.code,
      400,
      `Please provide: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Validate authentication and throw appropriate errors
 */
export function validateAuthentication(userId?: string, userRole?: string): void {
  if (!userId) {
    throw new AppError(
      'Authentication required',
      ErrorTypes.UNAUTHORIZED.code,
      401,
      'Please log in to continue'
    );
  }

  if (!userRole) {
    throw new AppError(
      'User role not found',
      ErrorTypes.UNAUTHORIZED.code,
      401,
      'Access denied'
    );
  }
}

/**
 * Validate user permissions for specific actions
 */
export function validatePermissions(
  userRole: string,
  requiredRoles: string[]
): void {
  if (!requiredRoles.includes(userRole)) {
    throw new AppError(
      `Insufficient permissions. Required: ${requiredRoles.join(' or ')}`,
      ErrorTypes.UNAUTHORIZED.code,
      403,
      'You don\'t have permission to perform this action'
    );
  }
}