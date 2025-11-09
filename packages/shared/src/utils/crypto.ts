/**
 * Cryptographic utility functions
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate SHA256 hash of a string
 */
export const sha256 = (data: string): string => {
  return createHash('sha256').update(data).digest('hex');
};

/**
 * Generate SHA256 hash of an object (JSON stringified)
 */
export const hashObject = (obj: unknown): string => {
  return sha256(JSON.stringify(obj));
};

/**
 * Generate a random UUID v4
 */
export const generateUUID = (): string => {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
};

/**
 * Generate a random anonymous ID for guest users
 */
export const generateAnonymousId = (): string => {
  return `anon_${randomBytes(16).toString('hex')}`;
};

/**
 * Validate Cardano stake key format
 */
export const isValidStakeKey = (stakeKey: string): boolean => {
  return /^stake1[a-z0-9]{53}$/.test(stakeKey);
};

/**
 * Validate Cardano address format
 */
export const isValidCardanoAddress = (address: string): boolean => {
  return /^addr1[a-z0-9]{58,}$/.test(address);
};

/**
 * Mask stake key for display (show first 10 and last 6 characters)
 */
export const maskStakeKey = (stakeKey: string): string => {
  if (stakeKey.length < 20) return stakeKey;
  return `${stakeKey.slice(0, 10)}...${stakeKey.slice(-6)}`;
};

/**
 * Mask email address for display
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;

  const maskedLocal =
    local.length <= 2
      ? local
      : `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`;

  return `${maskedLocal}@${domain}`;
};

/**
 * Generate a secure random token
 */
export const generateToken = (length: number = 32): string => {
  return randomBytes(length).toString('hex');
};

/**
 * Hash a password using SHA256 (for simple use cases)
 * Note: For production password hashing, use bcrypt or argon2
 */
export const hashPassword = (password: string, salt?: string): string => {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = sha256(password + actualSalt);
  return `${actualSalt}:${hash}`;
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const newHash = sha256(password + salt);
  return newHash === hash;
};

/**
 * Create a JWT payload (without signing - signing should be done server-side)
 */
export interface JWTPayload {
  sub: string; // player ID
  stakeKey?: string;
  username?: string;
  iat: number; // issued at
  exp: number; // expiration
}

/**
 * Create JWT payload with 24-hour expiration
 */
export const createJWTPayload = (
  playerId: string,
  stakeKey?: string,
  username?: string
): JWTPayload => {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: playerId,
    stakeKey,
    username,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
  };
};

/**
 * Check if JWT payload is expired
 */
export const isJWTExpired = (payload: JWTPayload): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
};

/**
 * Encode data to base64
 */
export const encodeBase64 = (data: string): string => {
  return Buffer.from(data).toString('base64');
};

/**
 * Decode data from base64
 */
export const decodeBase64 = (data: string): string => {
  return Buffer.from(data, 'base64').toString('utf-8');
};

/**
 * Generate a correlation ID for request tracing
 */
export const generateCorrelationId = (): string => {
  return `${Date.now()}-${randomBytes(8).toString('hex')}`;
};
