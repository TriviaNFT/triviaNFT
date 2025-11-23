/**
 * Asset Name Error Handling
 * 
 * This module provides custom error classes and error codes for NFT asset name
 * validation and processing according to Requirements 7.1-7.7.
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for asset name validation failures
 * 
 * These codes correspond to specific validation requirements:
 * - INVALID_PREFIX: Asset name must start with TNFT_V1_ (Requirement 7.1)
 * - INVALID_VERSION: Version must be V1
 * - INVALID_LENGTH: Asset name must not exceed 32 bytes (Requirement 7.3)
 * - INVALID_CHARACTERS: Only A-Z, 0-9, and underscore allowed (Requirement 7.2)
 * - INVALID_CATEGORY_CODE: Category code must be one of 10 valid codes (Requirement 7.5)
 * - INVALID_TIER_CODE: Tier code must be REG, ULT, MAST, or SEAS (Requirement 7.6)
 * - INVALID_SEASON_CODE: Seasonal NFTs must have valid season code (Requirement 7.7)
 * - INVALID_HEX_ID: Hex ID must be exactly 8 lowercase hex characters (Requirement 7.4)
 * - MISSING_REQUIRED_FIELD: Required field missing for tier type
 */
export const ERROR_CODES = {
  INVALID_PREFIX: 'INVALID_PREFIX',
  INVALID_VERSION: 'INVALID_VERSION',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_CHARACTERS: 'INVALID_CHARACTERS',
  INVALID_CATEGORY_CODE: 'INVALID_CATEGORY_CODE',
  INVALID_TIER_CODE: 'INVALID_TIER_CODE',
  INVALID_SEASON_CODE: 'INVALID_SEASON_CODE',
  INVALID_HEX_ID: 'INVALID_HEX_ID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Human-readable error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_PREFIX: 'Asset name must start with TNFT_V1_',
  INVALID_VERSION: 'Asset name version must be V1',
  INVALID_LENGTH: 'Asset name exceeds maximum length of 32 bytes',
  INVALID_CHARACTERS: 'Asset name contains invalid characters (only A-Z, 0-9, and underscore allowed)',
  INVALID_CATEGORY_CODE: 'Invalid category code (must be one of: ARTS, ENT, GEO, HIST, MYTH, NAT, SCI, SPORT, TECH, WEIRD)',
  INVALID_TIER_CODE: 'Invalid tier code (must be one of: REG, ULT, MAST, SEAS)',
  INVALID_SEASON_CODE: 'Invalid or missing season code for seasonal NFT',
  INVALID_HEX_ID: 'Invalid hex ID (must be exactly 8 lowercase hexadecimal characters)',
  MISSING_REQUIRED_FIELD: 'Required field is missing for the specified tier type',
};

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * Custom error class for asset name validation failures
 * 
 * This error class provides structured error information including:
 * - A human-readable error message
 * - A machine-readable error code
 * - Optional details about the validation failure
 * 
 * @example
 * throw new AssetNameValidationError(
 *   'Invalid hex ID: must be 8 lowercase hexadecimal characters',
 *   'INVALID_HEX_ID',
 *   { id: 'INVALID' }
 * );
 */
export class AssetNameValidationError extends Error {
  /**
   * The error code identifying the type of validation failure
   */
  public readonly code: ErrorCode;

  /**
   * Optional additional details about the error
   */
  public readonly details?: any;

  /**
   * Creates a new AssetNameValidationError
   * 
   * @param message - Human-readable error message
   * @param code - Machine-readable error code from ERROR_CODES
   * @param details - Optional additional context about the error
   */
  constructor(
    message: string,
    code: ErrorCode,
    details?: any
  ) {
    super(message);
    this.name = 'AssetNameValidationError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssetNameValidationError);
    }
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Returns a string representation of the error
   */
  toString(): string {
    const detailsStr = this.details ? ` (${JSON.stringify(this.details)})` : '';
    return `${this.name} [${this.code}]: ${this.message}${detailsStr}`;
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Creates an error for invalid prefix
 * 
 * @param assetName - The asset name that failed validation
 * @returns AssetNameValidationError with INVALID_PREFIX code
 */
export function createInvalidPrefixError(assetName: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_PREFIX,
    'INVALID_PREFIX',
    { assetName, expected: 'TNFT_V1_' }
  );
}

/**
 * Creates an error for invalid version
 * 
 * @param version - The version that was found
 * @returns AssetNameValidationError with INVALID_VERSION code
 */
export function createInvalidVersionError(version: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_VERSION,
    'INVALID_VERSION',
    { version, expected: 'V1' }
  );
}

/**
 * Creates an error for exceeding maximum length
 * 
 * @param assetName - The asset name that is too long
 * @param maxLength - The maximum allowed length (default: 32)
 * @returns AssetNameValidationError with INVALID_LENGTH code
 */
export function createInvalidLengthError(assetName: string, maxLength: number = 32): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_LENGTH,
    'INVALID_LENGTH',
    { assetName, length: assetName.length, maxLength }
  );
}

/**
 * Creates an error for invalid characters
 * 
 * @param assetName - The asset name with invalid characters
 * @returns AssetNameValidationError with INVALID_CHARACTERS code
 */
export function createInvalidCharactersError(assetName: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_CHARACTERS,
    'INVALID_CHARACTERS',
    { assetName, allowed: 'A-Z, 0-9, underscore' }
  );
}

/**
 * Creates an error for invalid category code
 * 
 * @param categoryCode - The invalid category code
 * @returns AssetNameValidationError with INVALID_CATEGORY_CODE code
 */
export function createInvalidCategoryCodeError(categoryCode: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_CATEGORY_CODE,
    'INVALID_CATEGORY_CODE',
    { 
      categoryCode, 
      validCodes: ['ARTS', 'ENT', 'GEO', 'HIST', 'MYTH', 'NAT', 'SCI', 'SPORT', 'TECH', 'WEIRD']
    }
  );
}

/**
 * Creates an error for invalid tier code
 * 
 * @param tierCode - The invalid tier code
 * @returns AssetNameValidationError with INVALID_TIER_CODE code
 */
export function createInvalidTierCodeError(tierCode: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_TIER_CODE,
    'INVALID_TIER_CODE',
    { tierCode, validCodes: ['REG', 'ULT', 'MAST', 'SEAS'] }
  );
}

/**
 * Creates an error for invalid season code
 * 
 * @param seasonCode - The invalid season code (or undefined if missing)
 * @returns AssetNameValidationError with INVALID_SEASON_CODE code
 */
export function createInvalidSeasonCodeError(seasonCode?: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_SEASON_CODE,
    'INVALID_SEASON_CODE',
    { seasonCode, expectedFormat: 'WI1, SP1, SU1, FA1, etc.' }
  );
}

/**
 * Creates an error for invalid hex ID
 * 
 * @param id - The invalid hex ID
 * @returns AssetNameValidationError with INVALID_HEX_ID code
 */
export function createInvalidHexIdError(id: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.INVALID_HEX_ID,
    'INVALID_HEX_ID',
    { id, expectedFormat: '8 lowercase hexadecimal characters (0-9a-f)' }
  );
}

/**
 * Creates an error for missing required field
 * 
 * @param fieldName - The name of the missing field
 * @param tier - The tier type that requires the field
 * @returns AssetNameValidationError with MISSING_REQUIRED_FIELD code
 */
export function createMissingRequiredFieldError(fieldName: string, tier: string): AssetNameValidationError {
  return new AssetNameValidationError(
    ERROR_MESSAGES.MISSING_REQUIRED_FIELD,
    'MISSING_REQUIRED_FIELD',
    { fieldName, tier }
  );
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is an AssetNameValidationError
 * 
 * @param error - The error to check
 * @returns true if the error is an AssetNameValidationError
 */
export function isAssetNameValidationError(error: unknown): error is AssetNameValidationError {
  return error instanceof AssetNameValidationError;
}

/**
 * Type guard to check if an error has a specific error code
 * 
 * @param error - The error to check
 * @param code - The error code to check for
 * @returns true if the error is an AssetNameValidationError with the specified code
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isAssetNameValidationError(error) && error.code === code;
}
