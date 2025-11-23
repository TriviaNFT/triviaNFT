/**
 * NFT Asset Name Utilities
 * 
 * This module provides functions for building, parsing, and validating
 * NFT asset names according to the TriviaNFT naming convention.
 * 
 * New Format: TNFT_V1_{...}_{id}
 * - Tier 1 (Category): TNFT_V1_{CAT}_REG_{id}
 * - Tier 2 (Category Ultimate): TNFT_V1_{CAT}_ULT_{id}
 * - Tier 3 (Master Ultimate): TNFT_V1_MAST_{id}
 * - Tier 4 (Seasonal Ultimate): TNFT_V1_SEAS_{SeasonCode}_ULT_{id}
 * 
 * Legacy Format Support:
 * The parser also supports legacy format names (pre-standardization) such as:
 * - "quantum-explorer", "dna-helix", "ancient-scroll", etc.
 * These are kebab-case descriptive names that were used before the standardized format.
 * Legacy names are automatically detected and parsed with a fallback mechanism.
 */

import { randomBytes } from 'crypto';
import { AssetNameValidationError } from './asset-name-errors';
import { getMetricsStore } from './nft-naming-metrics';
import { Logger } from './logger';

// Re-export error handling for convenience
export { AssetNameValidationError, ERROR_CODES } from './asset-name-errors';

// Optional logger instance - can be set by consumers
let logger: Logger | null = null;

/**
 * Set the logger instance for NFT naming operations
 * This allows consumers to provide their own logger with context
 */
export function setNamingLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Get the current logger instance or create a default one
 */
function getLogger(): Logger {
  if (!logger) {
    logger = new Logger({ module: 'nft-naming' });
  }
  return logger;
}

// ============================================================================
// Type Definitions
// ============================================================================

export type TierType = 'category' | 'category_ultimate' | 'master_ultimate' | 'seasonal_ultimate';

export type TierCode = 'REG' | 'ULT' | 'MAST' | 'SEAS';

export type CategoryCode = 
  | 'ARTS' 
  | 'ENT' 
  | 'GEO' 
  | 'HIST' 
  | 'MYTH' 
  | 'NAT' 
  | 'SCI' 
  | 'SPORT' 
  | 'TECH' 
  | 'WEIRD';

export type SeasonCode = string; // Format: WI1, SP1, SU1, FA1, WI2, etc.

export interface BuildAssetNameParams {
  tier: TierType;
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string; // 8-character hex
}

export interface AssetNameComponents {
  prefix: 'TNFT';
  version: 'V1';
  tier: TierCode;
  categoryCode?: CategoryCode;
  seasonCode?: SeasonCode;
  id: string;
}

// ============================================================================
// Constants
// ============================================================================

const PREFIX = 'TNFT';
const VERSION = 'V1';
const MAX_LENGTH = 32;
// const VALID_CHARS_REGEX = /^[A-Za-z0-9_]+$/; // Allow both uppercase and lowercase for hex IDs
const HEX_ID_REGEX = /^[0-9a-f]{8}$/;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates an 8-character lowercase hexadecimal ID
 */
export function generateHexId(): string {
  const hexId = randomBytes(4).toString('hex');
  
  // Log hex ID generation
  getLogger().logHexIdGeneration(hexId);
  
  return hexId;
}

/**
 * Maps tier type to tier code
 */
function getTierCode(tier: TierType): TierCode {
  switch (tier) {
    case 'category':
      return 'REG';
    case 'category_ultimate':
      return 'ULT';
    case 'master_ultimate':
      return 'MAST';
    case 'seasonal_ultimate':
      return 'SEAS';
  }
}



// ============================================================================
// Main Functions
// ============================================================================

/**
 * Builds an asset name from the provided parameters
 * 
 * @param params - The parameters for building the asset name
 * @returns The formatted asset name string
 * @throws {AssetNameValidationError} If parameters are invalid
 * 
 * @example
 * buildAssetName({ tier: 'category', categoryCode: 'SCI', id: '12b3de7d' })
 * // Returns: 'TNFT_V1_SCI_REG_12b3de7d'
 */
export function buildAssetName(params: BuildAssetNameParams): string {
  const { tier, categoryCode, seasonCode, id } = params;
  const metrics = getMetricsStore();

  try {
    // Validate hex ID
    if (!id || !HEX_ID_REGEX.test(id)) {
      const error = new AssetNameValidationError(
        `Invalid hex ID: must be 8 lowercase hexadecimal characters`,
        'INVALID_HEX_ID',
        { id }
      );
      
      // Log failure
      getLogger().logAssetNameGeneration(tier, '', false, { 
        error: error.message, 
        errorCode: error.code,
        params 
      });
      metrics.recordGeneration(tier, false);
      
      throw error;
    }

    // Validate required fields based on tier
    if ((tier === 'category' || tier === 'category_ultimate') && !categoryCode) {
      const error = new AssetNameValidationError(
        `Category code is required for tier: ${tier}`,
        'MISSING_REQUIRED_FIELD',
        { tier }
      );
      
      // Log failure
      getLogger().logAssetNameGeneration(tier, '', false, { 
        error: error.message, 
        errorCode: error.code,
        params 
      });
      metrics.recordGeneration(tier, false);
      
      throw error;
    }

    if (tier === 'seasonal_ultimate' && !seasonCode) {
      const error = new AssetNameValidationError(
        `Season code is required for tier: ${tier}`,
        'MISSING_REQUIRED_FIELD',
        { tier }
      );
      
      // Log failure
      getLogger().logAssetNameGeneration(tier, '', false, { 
        error: error.message, 
        errorCode: error.code,
        params 
      });
      metrics.recordGeneration(tier, false);
      
      throw error;
    }

    // Build asset name based on tier
    let assetName: string;
    const tierCode = getTierCode(tier);

    switch (tier) {
      case 'category':
        assetName = `${PREFIX}_${VERSION}_${categoryCode}_${tierCode}_${id}`;
        break;
      case 'category_ultimate':
        assetName = `${PREFIX}_${VERSION}_${categoryCode}_${tierCode}_${id}`;
        break;
      case 'master_ultimate':
        assetName = `${PREFIX}_${VERSION}_${tierCode}_${id}`;
        break;
      case 'seasonal_ultimate':
        assetName = `${PREFIX}_${VERSION}_${tierCode}_${seasonCode}_ULT_${id}`;
        break;
    }

    // Validate length
    if (assetName.length > MAX_LENGTH) {
      const error = new AssetNameValidationError(
        `Asset name exceeds maximum length of ${MAX_LENGTH} bytes`,
        'INVALID_LENGTH',
        { length: assetName.length, assetName }
      );
      
      // Log failure
      getLogger().logAssetNameGeneration(tier, assetName, false, { 
        error: error.message, 
        errorCode: error.code,
        length: assetName.length,
        params 
      });
      metrics.recordGeneration(tier, false);
      
      throw error;
    }

    // Log success
    getLogger().logAssetNameGeneration(tier, assetName, true, { 
      categoryCode, 
      seasonCode, 
      id,
      length: assetName.length 
    });
    metrics.recordGeneration(tier, true);

    return assetName;
  } catch (error) {
    // If error wasn't already logged, log it now
    if (!(error instanceof AssetNameValidationError)) {
      getLogger().logAssetNameGeneration(tier, '', false, { 
        error: error instanceof Error ? error.message : String(error),
        params 
      });
      metrics.recordGeneration(tier, false);
    }
    throw error;
  }
}

/**
 * Parses a legacy format asset name (pre-standardization)
 * Legacy format: descriptive names like "quantum-explorer", "dna-helix", etc.
 * 
 * @param assetName - The legacy asset name string to parse
 * @returns The parsed components with legacy flag or null if invalid
 */
export function parseLegacyFormat(assetName: string): AssetNameComponents | null {
  if (!assetName || typeof assetName !== 'string') {
    return null;
  }

  // Legacy format characteristics:
  // - No TNFT_V1 prefix
  // - Typically kebab-case or descriptive names
  // - May contain hyphens, lowercase letters, numbers
  // - Examples: "quantum-explorer", "dna-helix", "ancient-scroll"
  
  // Validate it's not the new format
  if (assetName.startsWith(`${PREFIX}_${VERSION}_`)) {
    return null;
  }

  // Legacy names should be reasonable length and contain valid characters
  // Minimum length of 5 to avoid matching very short strings
  const legacyRegex = /^[a-z0-9-]+$/;
  if (!legacyRegex.test(assetName) || assetName.length < 5 || assetName.length > 64) {
    return null;
  }

  // For legacy format, we can't determine tier or category from the name alone
  // Return a minimal structure with the original name as the ID
  // The tier will need to be determined from database context
  return {
    prefix: 'TNFT',
    version: 'V1',
    tier: 'REG', // Default to REG for legacy names
    id: assetName, // Use the full legacy name as the ID
  };
}

/**
 * Parses an asset name and extracts its components
 * Supports both new standardized format and legacy format
 * 
 * @param assetName - The asset name string to parse
 * @returns The parsed components or null if invalid
 * 
 * @example
 * // New format
 * parseAssetName('TNFT_V1_SCI_REG_12b3de7d')
 * // Returns: { prefix: 'TNFT', version: 'V1', tier: 'REG', categoryCode: 'SCI', id: '12b3de7d' }
 * 
 * @example
 * // Legacy format
 * parseAssetName('quantum-explorer')
 * // Returns: { prefix: 'TNFT', version: 'V1', tier: 'REG', id: 'quantum-explorer' }
 */
export function parseAssetName(assetName: string): AssetNameComponents | null {
  const metrics = getMetricsStore();

  if (!assetName || typeof assetName !== 'string') {
    getLogger().logAssetNameParsing(assetName || 'null', false);
    metrics.recordParsing(false);
    return null;
  }

  // Try new format first
  const newFormat = parseNewFormat(assetName);
  if (newFormat) {
    getLogger().logAssetNameParsing(assetName, true, false, { 
      tier: newFormat.tier,
      categoryCode: newFormat.categoryCode,
      seasonCode: newFormat.seasonCode 
    });
    metrics.recordParsing(true, false);
    return newFormat;
  }

  // Fall back to legacy format
  const legacyFormat = parseLegacyFormat(assetName);
  if (legacyFormat) {
    getLogger().logAssetNameParsing(assetName, true, true);
    metrics.recordParsing(true, true);
    return legacyFormat;
  }

  // Failed to parse
  getLogger().logAssetNameParsing(assetName, false, false, { 
    reason: 'Does not match new or legacy format' 
  });
  metrics.recordParsing(false);
  return null;
}

/**
 * Parses the new standardized asset name format
 * 
 * @param assetName - The asset name string to parse
 * @returns The parsed components or null if invalid
 * 
 * @internal
 */
function parseNewFormat(assetName: string): AssetNameComponents | null {
  const parts = assetName.split('_');

  // Minimum parts: TNFT_V1_MAST_id (4 parts)
  if (parts.length < 4) {
    return null;
  }

  // Validate prefix and version
  if (parts[0] !== PREFIX || parts[1] !== VERSION) {
    return null;
  }

  // Parse based on structure
  // Tier 3 (Master): TNFT_V1_MAST_{id} (4 parts)
  if (parts.length === 4 && parts[2] === 'MAST') {
    const id = parts[3];
    if (!HEX_ID_REGEX.test(id)) return null;
    
    return {
      prefix: PREFIX,
      version: VERSION,
      tier: 'MAST',
      id,
    };
  }

  // Tier 1 (Category) or Tier 2 (Category Ultimate): TNFT_V1_{CAT}_{REG|ULT}_{id} (5 parts)
  if (parts.length === 5) {
    const categoryCode = parts[2] as CategoryCode;
    const tierCode = parts[3] as TierCode;
    const id = parts[4];

    if (!HEX_ID_REGEX.test(id)) return null;
    if (tierCode !== 'REG' && tierCode !== 'ULT') return null;

    return {
      prefix: PREFIX,
      version: VERSION,
      tier: tierCode,
      categoryCode,
      id,
    };
  }

  // Tier 4 (Seasonal): TNFT_V1_SEAS_{SeasonCode}_ULT_{id} (6 parts)
  if (parts.length === 6 && parts[2] === 'SEAS' && parts[4] === 'ULT') {
    const seasonCode = parts[3];
    const id = parts[5];

    if (!HEX_ID_REGEX.test(id)) return null;

    return {
      prefix: PREFIX,
      version: VERSION,
      tier: 'SEAS',
      seasonCode,
      id,
    };
  }

  return null;
}

/**
 * Validates an asset name against the specification
 * Supports both new standardized format and legacy format
 * 
 * @param assetName - The asset name to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * validateAssetName('TNFT_V1_SCI_REG_12b3de7d') // Returns: true
 * validateAssetName('quantum-explorer') // Returns: true (legacy format)
 * validateAssetName('INVALID_NAME') // Returns: false
 */
export function validateAssetName(assetName: string): boolean {
  const metrics = getMetricsStore();

  // Check basic requirements
  if (!assetName || typeof assetName !== 'string') {
    getLogger().logAssetNameValidation(assetName || 'null', false, 'INVALID_INPUT', { 
      reason: 'Asset name is null or not a string' 
    });
    metrics.recordValidation(false, 'INVALID_INPUT');
    return false;
  }

  // Try to parse - if successful, it's valid (handles both new and legacy formats)
  const parsed = parseAssetName(assetName);
  const isValid = parsed !== null;

  if (isValid) {
    getLogger().logAssetNameValidation(assetName, true);
    metrics.recordValidation(true);
  } else {
    getLogger().logAssetNameValidation(assetName, false, 'INVALID_FORMAT', { 
      reason: 'Does not match new or legacy format' 
    });
    metrics.recordValidation(false, 'INVALID_FORMAT');
  }

  return isValid;
}
