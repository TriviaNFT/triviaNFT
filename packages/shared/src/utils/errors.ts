/**
 * Custom error classes
 */

/**
 * Base error class for application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    details?: Record<string, unknown>
  ) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    details?: Record<string, unknown>
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', details);
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service temporarily unavailable',
    details?: Record<string, unknown>
  ) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Gateway timeout error (504)
 */
export class GatewayTimeoutError extends AppError {
  constructor(
    message: string = 'Gateway timeout',
    details?: Record<string, unknown>
  ) {
    super(message, 504, 'GATEWAY_TIMEOUT', details);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Redis error
 */
export class RedisError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'REDIS_ERROR', details);
  }
}

/**
 * Blockchain error
 */
export class BlockchainError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'BLOCKCHAIN_ERROR', details);
  }
}

/**
 * Session error
 */
export class SessionError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'SESSION_ERROR', details);
  }
}

/**
 * Eligibility error
 */
export class EligibilityError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'ELIGIBILITY_ERROR', details);
  }
}

/**
 * NFT error
 */
export class NFTError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'NFT_ERROR', details);
  }
}

/**
 * Check if error is an AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

/**
 * Convert unknown error to AppError
 */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message);
  }

  return new InternalServerError('An unknown error occurred');
};

/**
 * Error handler utility for async functions
 */
export const catchAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toAppError(error);
    }
  };
};
