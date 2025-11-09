/**
 * Validation middleware for Lambda handlers
 */

import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatValidationErrors, sanitizeForDatabase } from './validation.js';

/**
 * Validate request body against a Zod schema
 */
export const validateRequestBody = <T>(
  event: APIGatewayProxyEvent,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: APIGatewayProxyResult } => {
  try {
    // Parse body
    const body = event.body ? JSON.parse(event.body) : {};

    // Validate against schema
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Validation failed',
            details: formatValidationErrors(result.error),
          }),
        },
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      response: {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
        }),
      },
    };
  }
};

/**
 * Validate path parameters
 */
export const validatePathParameters = (
  event: APIGatewayProxyEvent,
  requiredParams: string[]
): { success: true; params: Record<string, string> } | { success: false; response: APIGatewayProxyResult } => {
  const params = event.pathParameters || {};
  const missing: string[] = [];

  for (const param of requiredParams) {
    if (!params[param]) {
      missing.push(param);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      response: {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required path parameters',
          missing,
        }),
      },
    };
  }

  // Filter out undefined values
  const validParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      validParams[key] = value;
    }
  }

  return { success: true, params: validParams };
};

/**
 * Validate query parameters against a Zod schema
 */
export const validateQueryParameters = <T>(
  event: APIGatewayProxyEvent,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: APIGatewayProxyResult } => {
  const queryParams = event.queryStringParameters || {};

  const result = schema.safeParse(queryParams);

  if (!result.success) {
    return {
      success: false,
      response: {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid query parameters',
          details: formatValidationErrors(result.error),
        }),
      },
    };
  }

  return { success: true, data: result.data };
};

/**
 * Sanitize all string fields in an object recursively
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeForDatabase(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeForDatabase(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
};

/**
 * Validate content length to prevent large payloads
 */
export const validateContentLength = (
  event: APIGatewayProxyEvent,
  maxBytes: number = 1024 * 100 // 100KB default
): { success: true } | { success: false; response: APIGatewayProxyResult } => {
  const contentLength = event.headers['content-length'] || event.headers['Content-Length'];

  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      success: false,
      response: {
        statusCode: 413,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Payload too large',
          maxBytes,
        }),
      },
    };
  }

  return { success: true };
};

/**
 * Validate request origin (CORS)
 */
export const validateOrigin = (
  event: APIGatewayProxyEvent,
  allowedOrigins: string[]
): { success: true; origin: string } | { success: false; response: APIGatewayProxyResult } => {
  const origin = event.headers.origin || event.headers.Origin || '';

  if (!allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
    return {
      success: false,
      response: {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Origin not allowed',
        }),
      },
    };
  }

  return { success: true, origin };
};

/**
 * Rate limit check helper (to be used with Redis)
 */
export interface RateLimitConfig {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Extract identifier for rate limiting (IP or stake key)
 */
export const getRateLimitIdentifier = (event: APIGatewayProxyEvent): string => {
  // Try to get stake key from authorizer context
  const stakeKey = event.requestContext?.authorizer?.stakeKey;
  if (stakeKey) {
    return `stake:${stakeKey}`;
  }

  // Fall back to IP address
  const ip = event.requestContext?.identity?.sourceIp || 'unknown';
  return `ip:${ip}`;
};
