/**
 * Core error response logic (framework-agnostic)
 * 
 * This module contains the pure error handling logic without any framework dependencies.
 * It can be tested independently and used by the Next.js error handler.
 */

import { ZodError } from 'zod';
import { isAppError, AppError, InternalServerError } from '@trivia-nft/shared';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Error response with status code
 */
export interface ErrorResponseWithStatus {
  status: number;
  body: ErrorResponse;
}

/**
 * Log error with context
 */
function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  };

  console.error('API Error:', JSON.stringify(errorInfo, null, 2));
}

/**
 * Convert error to error response (pure function for testing)
 * 
 * @param error - The error to convert
 * @param context - Optional context for logging
 * @returns Error response with status code and body
 */
export function errorToResponse(
  error: unknown,
  context?: Record<string, unknown>
): ErrorResponseWithStatus {
  // Log error with context
  if (context) {
    logError(error, context);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = {
      issues: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };

    logError(error, { type: 'validation', details });

    return {
      status: 400,
      body: {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details,
      },
    };
  }

  // Handle application errors
  if (isAppError(error)) {
    logError(error, {
      type: 'application',
      statusCode: error.statusCode,
      code: error.code,
    });

    return {
      status: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Handle unknown errors
  logError(error, { type: 'unknown' });

  const internalError = new InternalServerError(
    error instanceof Error ? error.message : 'An unknown error occurred'
  );

  return {
    status: 500,
    body: internalError.toJSON(),
  };
}
