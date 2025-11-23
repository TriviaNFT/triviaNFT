/**
 * Lambda handler wrapper with structured logging and error handling
 * Requirement 46: Observability - Logging
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createLogger, extractCorrelationId, addCorrelationIdToResponse, Logger } from './logger';

export interface HandlerOptions {
  /**
   * Whether to log the request body (default: false for security)
   */
  logRequestBody?: boolean;

  /**
   * Whether to log the response body (default: false for security)
   */
  logResponseBody?: boolean;

  /**
   * Custom error handler
   */
  errorHandler?: (error: Error, logger: Logger) => APIGatewayProxyResult;
}

/**
 * Wrap a Lambda handler with structured logging and error handling
 */
export function withLogging(
  handler: (event: APIGatewayProxyEvent, context: Context, logger: Logger) => Promise<APIGatewayProxyResult>,
  options: HandlerOptions = {}
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();
    const correlationId = await extractCorrelationId(event);

    // Create logger with correlation ID
    const logger = createLogger(context, {
      correlationId,
      httpMethod: (event.requestContext as any)?.http?.method || event.httpMethod,
      path: (event.requestContext as any)?.http?.path || event.path,
      sourceIp: (event.requestContext as any)?.http?.sourceIp || event.requestContext?.identity?.sourceIp,
    });

    try {
      // Log incoming request
      logger.logRequest(
        (event.requestContext as any)?.http?.method || event.httpMethod || 'UNKNOWN',
        (event.requestContext as any)?.http?.path || event.path || '/',
        {
          queryStringParameters: event.queryStringParameters,
          pathParameters: event.pathParameters,
          ...(options.logRequestBody && event.body ? { body: event.body } : {}),
        }
      );

      // Execute handler
      const result = await handler(event, context, logger);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Log response
      logger.logResponse(
        (event.requestContext as any)?.http?.method || event.httpMethod || 'UNKNOWN',
        (event.requestContext as any)?.http?.path || event.path || '/',
        result.statusCode,
        durationMs,
        {
          ...(options.logResponseBody && result.body ? { body: result.body } : {}),
        }
      );

      // Add correlation ID to response
      return addCorrelationIdToResponse(correlationId, result);
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Log error
      logger.error('Lambda handler error', error as Error, {
        durationMs,
      });

      // Use custom error handler if provided
      if (options.errorHandler) {
        const errorResponse = options.errorHandler(error as Error, logger);
        return addCorrelationIdToResponse(correlationId, errorResponse);
      }

      // Default error response
      const errorResponse: APIGatewayProxyResult = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Internal server error',
          correlationId,
        }),
      };

      return addCorrelationIdToResponse(correlationId, errorResponse);
    }
  };
}

/**
 * Create a standard error response
 */
export function createErrorResponse(statusCode: number, message: string, correlationId?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
    },
    body: JSON.stringify({
      error: message,
      ...(correlationId ? { correlationId } : {}),
    }),
  };
}

/**
 * Create a standard success response
 */
export function createSuccessResponse(data: any, statusCode: number = 200, correlationId?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
    },
    body: JSON.stringify(data),
  };
}
