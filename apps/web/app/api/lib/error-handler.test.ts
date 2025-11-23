/**
 * Property-based tests for API error handling
 * 
 * Feature: vercel-inngest-deployment, Property 10: Error Message Appropriateness
 * Validates: Requirements 9.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  DatabaseError,
  RedisError,
  BlockchainError,
  SessionError,
  EligibilityError,
  NFTError,
} from '@trivia-nft/shared';
import { ZodError, ZodIssue } from 'zod';
import { errorToResponse } from './error-response';

describe('Property: Error Message Appropriateness', () => {
  /**
   * Property 10: Error Message Appropriateness
   * 
   * For any error condition (validation failure, not found, unauthorized, server error),
   * the system should return an appropriate HTTP status code and descriptive error message.
   * 
   * Validates: Requirements 9.6
   */
  it('should return appropriate status codes for AppError instances', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom(
          ValidationError,
          UnauthorizedError,
          ForbiddenError,
          NotFoundError,
          ConflictError,
          RateLimitError,
          InternalServerError,
          ServiceUnavailableError,
          GatewayTimeoutError,
          DatabaseError,
          RedisError,
          BlockchainError,
          SessionError,
          EligibilityError,
          NFTError
        ),
        (message, ErrorClass) => {
          // Create error instance
          const error = ErrorClass === NotFoundError 
            ? new ErrorClass('Resource')
            : new ErrorClass(message);

          // Handle the error
          const response = errorToResponse(error);

          // Verify response has correct status code
          expect(response.status).toBe(error.statusCode);

          // Verify response body structure
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('code');
          expect(typeof response.body.error).toBe('string');
          expect(typeof response.body.code).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
          expect(response.body.code.length).toBeGreaterThan(0);

          // Verify status code is in valid HTTP range
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(600);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 400 for validation errors with details', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            message: fc.string({ minLength: 5, maxLength: 50 }),
            code: fc.constantFrom('invalid_type', 'too_small', 'too_big', 'invalid_string'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (issues) => {
          // Create a ZodError with the generated issues
          const zodIssues: ZodIssue[] = issues.map(issue => ({
            code: issue.code as any,
            path: issue.path,
            message: issue.message,
          }));

          const zodError = new ZodError(zodIssues);

          // Handle the error
          const response = errorToResponse(zodError);

          // Verify 400 status code
          expect(response.status).toBe(400);

          // Verify response body
          expect(response.body.error).toBe('Validation error');
          expect(response.body.code).toBe('VALIDATION_ERROR');
          expect(response.body.details).toBeDefined();
          expect(response.body.details!.issues).toBeInstanceOf(Array);
          expect(response.body.details!.issues.length).toBe(issues.length);

          // Verify each issue is properly formatted
          response.body.details!.issues.forEach((issue: any, index: number) => {
            expect(issue).toHaveProperty('path');
            expect(issue).toHaveProperty('message');
            expect(issue).toHaveProperty('code');
            expect(typeof issue.path).toBe('string');
            expect(typeof issue.message).toBe('string');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 500 for unknown errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.boolean()
        ),
        (unknownError) => {
          // Handle unknown error
          const response = errorToResponse(unknownError);

          // Verify 500 status code
          expect(response.status).toBe(500);

          // Verify response body
          expect(response.body.error).toBeDefined();
          expect(response.body.code).toBe('INTERNAL_ERROR');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map error types to correct HTTP status codes', () => {
    const errorMappings = [
      { ErrorClass: ValidationError, expectedStatus: 400, message: 'Validation failed' },
      { ErrorClass: UnauthorizedError, expectedStatus: 401, message: 'Unauthorized' },
      { ErrorClass: ForbiddenError, expectedStatus: 403, message: 'Forbidden' },
      { ErrorClass: NotFoundError, expectedStatus: 404, message: 'Resource' },
      { ErrorClass: ConflictError, expectedStatus: 409, message: 'Conflict' },
      { ErrorClass: RateLimitError, expectedStatus: 429, message: 'Rate limit' },
      { ErrorClass: InternalServerError, expectedStatus: 500, message: 'Internal error' },
      { ErrorClass: ServiceUnavailableError, expectedStatus: 503, message: 'Service unavailable' },
      { ErrorClass: GatewayTimeoutError, expectedStatus: 504, message: 'Gateway timeout' },
    ];

    errorMappings.forEach(({ ErrorClass, expectedStatus, message }) => {
      const error = ErrorClass === NotFoundError 
        ? new ErrorClass(message)
        : new ErrorClass(message);
      
      const response = errorToResponse(error);
      
      expect(response.status).toBe(expectedStatus);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBeDefined();
    });
  });

  it('should include context in error logs without exposing it in response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.record({
          endpoint: fc.string({ minLength: 1, maxLength: 50 }),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          userId: fc.uuid(),
        }),
        (message, context) => {
          const error = new ValidationError(message);

          // Handle error with context
          const response = errorToResponse(error, context);

          // Verify response doesn't expose context
          expect(response.body).not.toHaveProperty('endpoint');
          expect(response.body).not.toHaveProperty('method');
          expect(response.body).not.toHaveProperty('userId');

          // Verify standard error structure
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('code');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve error details when provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.record({
          field: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          reason: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (message, details) => {
          const error = new ValidationError(message, details);

          const response = errorToResponse(error);

          expect(response.body.details).toBeDefined();
          expect(response.body.details).toEqual(details);
        }
      ),
      { numRuns: 100 }
    );
  });
});
