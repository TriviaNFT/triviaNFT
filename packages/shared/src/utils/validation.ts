/**
 * Validation helper functions
 */

import { z } from 'zod';

/**
 * Validate data against a Zod schema and return typed result
 */
export const validate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
};

/**
 * Validate and throw on error
 */
export const validateOrThrow = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

/**
 * Format Zod validation errors for API responses
 */
export const formatValidationErrors = (error: z.ZodError): Record<string, string[]> => {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
};

/**
 * Sanitize HTML input (more aggressive sanitization)
 */
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
};

/**
 * Sanitize user input for database storage
 */
export const sanitizeForDatabase = (input: string): string => {
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
};

/**
 * Validate and sanitize Cardano stake key
 */
export const validateAndSanitizeStakeKey = (stakeKey: string): string | null => {
  const sanitized = stakeKey.trim().toLowerCase();
  if (!/^stake1[a-z0-9]{53}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
};

/**
 * Validate and sanitize Cardano address
 */
export const validateAndSanitizeAddress = (address: string): string | null => {
  const sanitized = address.trim().toLowerCase();
  if (!/^addr1[a-z0-9]{58,}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
};

/**
 * Validate question index (0-9)
 */
export const isValidQuestionIndex = (index: number): boolean => {
  return Number.isInteger(index) && index >= 0 && index <= 9;
};

/**
 * Validate option index (0-3)
 */
export const isValidOptionIndex = (index: number): boolean => {
  return Number.isInteger(index) && index >= 0 && index <= 3;
};

/**
 * Validate time in milliseconds (0-10000 for 10 second timer)
 */
export const isValidAnswerTime = (timeMs: number): boolean => {
  return Number.isInteger(timeMs) && timeMs >= 0 && timeMs <= 10000;
};

/**
 * Validate score (0-10)
 */
export const isValidScore = (score: number): boolean => {
  return Number.isInteger(score) && score >= 0 && score <= 10;
};

/**
 * Check if value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Check if value is a positive integer
 */
export const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

/**
 * Check if value is a non-negative integer
 */
export const isNonNegativeInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  limit?: number,
  offset?: number
): { limit: number; offset: number } => {
  const validLimit =
    limit && isPositiveInteger(limit) && limit <= 100 ? limit : 10;
  const validOffset = offset && isNonNegativeInteger(offset) ? offset : 0;

  return { limit: validLimit, offset: validOffset };
};

/**
 * Validate array has minimum length
 */
export const hasMinLength = <T>(arr: T[], min: number): boolean => {
  return Array.isArray(arr) && arr.length >= min;
};

/**
 * Validate array has exact length
 */
export const hasExactLength = <T>(arr: T[], length: number): boolean => {
  return Array.isArray(arr) && arr.length === length;
};

/**
 * Check if all elements in array are unique
 */
export const hasUniqueElements = <T>(arr: T[]): boolean => {
  return new Set(arr).size === arr.length;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate IPFS CID format (simplified)
 */
export const isValidIPFSCID = (cid: string): boolean => {
  // Simplified validation - CIDv0 starts with Qm, CIDv1 starts with b
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/.test(cid);
};
