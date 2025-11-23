/**
 * JWT Token Utilities
 * 
 * Handles JWT token generation and verification for authentication.
 */

import { UnauthorizedError } from '@trivia-nft/shared';

interface JWTPayload {
  sub: string; // player ID
  stakeKey?: string;
  anonId?: string;
  username?: string;
  iat: number;
  exp: number;
}

/**
 * Get JWT secret from environment variable
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be set');
  }
  return secret;
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Create HMAC SHA256 signature
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return base64UrlEncode(hmac.digest('base64'));
}

/**
 * Generate JWT token
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getJWTSecret();
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const secret = getJWTSecret();
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedError('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  
  // Verify signature
  const expectedSignature = await createSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  if (signature !== expectedSignature) {
    throw new UnauthorizedError('Invalid token signature');
  }

  // Decode payload
  const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new UnauthorizedError('Token expired');
  }

  return payload;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string {
  if (!authHeader) {
    throw new UnauthorizedError('No authorization header provided');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Invalid authorization header format');
  }

  return parts[1];
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  return JSON.parse(base64UrlDecode(parts[1]));
}

/**
 * Alias for verifyToken - verify and decode JWT token
 */
export const verifyJWT = verifyToken;
