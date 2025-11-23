/**
 * Cryptographic utility functions
 * Platform-aware: Uses Web Crypto API on web, Node crypto on server
 */

// Detect if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined';

/**
 * Generate SHA256 hash of a string
 */
export const sha256 = async (data: string): Promise<string> => {
  if (isBrowser) {
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Use Node crypto
    const { createHash } = await import('crypto');
    return createHash('sha256').update(data).digest('hex');
  }
};

/**
 * Generate SHA256 hash of an object (JSON stringified)
 */
export const hashObject = async (obj: unknown): Promise<string> => {
  return sha256(JSON.stringify(obj));
};

/**
 * Generate random bytes (platform-aware)
 */
const getRandomBytes = async (length: number): Promise<Uint8Array> => {
  if (isBrowser) {
    // Use Web Crypto API
    return crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Use Node crypto
    const { randomBytes } = await import('crypto');
    return new Uint8Array(randomBytes(length));
  }
};

/**
 * Convert Uint8Array to hex string
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a random UUID v4
 */
export const generateUUID = async (): Promise<string> => {
  const bytes = await getRandomBytes(16);
  const hex = bytesToHex(bytes);
  return hex.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
};

/**
 * Generate a random anonymous ID for guest users
 */
export const generateAnonymousId = async (): Promise<string> => {
  const bytes = await getRandomBytes(16);
  return `anon_${bytesToHex(bytes)}`;
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
export const generateToken = async (length: number = 32): Promise<string> => {
  const bytes = await getRandomBytes(length);
  return bytesToHex(bytes);
};

/**
 * Hash a password using SHA256 (for simple use cases)
 * Note: For production password hashing, use bcrypt or argon2
 */
export const hashPassword = async (password: string, salt?: string): Promise<string> => {
  const saltBytes = await getRandomBytes(16);
  const actualSalt = salt || bytesToHex(saltBytes);
  const hash = await sha256(password + actualSalt);
  return `${actualSalt}:${hash}`;
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const [salt, hash] = hashedPassword.split(':');
  const newHash = await sha256(password + salt);
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
 * Encode data to base64 (platform-aware)
 */
export const encodeBase64 = async (data: string): Promise<string> => {
  if (isBrowser) {
    // Use browser's btoa
    return btoa(data);
  } else {
    // Use Node Buffer
    const { Buffer } = await import('buffer');
    return Buffer.from(data).toString('base64');
  }
};

/**
 * Decode data from base64 (platform-aware)
 */
export const decodeBase64 = async (data: string): Promise<string> => {
  if (isBrowser) {
    // Use browser's atob
    return atob(data);
  } else {
    // Use Node Buffer
    const { Buffer } = await import('buffer');
    return Buffer.from(data, 'base64').toString('utf-8');
  }
};

/**
 * Generate a correlation ID for request tracing
 */
export const generateCorrelationId = async (): Promise<string> => {
  const bytes = await getRandomBytes(8);
  return `${Date.now()}-${bytesToHex(bytes)}`;
};
