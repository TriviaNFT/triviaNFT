/**
 * Centralized error handling for API routes
 * 
 * Provides consistent error response format across all routes with:
 * - Appropriate HTTP status codes for different error types
 * - Error logging with context
 * - CORS headers
 * 
 * Requirements: 4.5
 */

import { NextResponse } from 'next/server';
import { errorToResponse, ErrorResponse } from './error-response';

// Re-export for convenience
export { errorToResponse, ErrorResponse } from './error-response';

/**
 * CORS headers for error responses
 */
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
};

/**
 * Main error handler for API routes
 * 
 * Handles different error types and returns appropriate responses:
 * - ZodError (validation): 400 with validation details
 * - AppError: Uses error's statusCode and code
 * - Unknown errors: 500 Internal Server Error
 * 
 * All errors are logged with context for debugging.
 * 
 * @param error - The error to handle
 * @param context - Optional context for logging (e.g., endpoint, userId)
 * @returns NextResponse with appropriate status code and error message
 */
export function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const response = errorToResponse(error, context);

  return NextResponse.json(response.body, {
    status: response.status,
    headers: CORS_HEADERS,
  });
}

/**
 * Create CORS preflight response
 */
export function createCorsPreflightResponse(methods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
