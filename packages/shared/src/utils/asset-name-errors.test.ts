/**
 * Tests for Asset Name Error Handling
 * 
 * Validates Requirements 7.1-7.7
 */

import { describe, it, expect } from 'vitest';
import {
  AssetNameValidationError,
  ERROR_CODES,
  ERROR_MESSAGES,
  createInvalidPrefixError,
  createInvalidVersionError,
  createInvalidLengthError,
  createInvalidCharactersError,
  createInvalidCategoryCodeError,
  createInvalidTierCodeError,
  createInvalidSeasonCodeError,
  createInvalidHexIdError,
  createMissingRequiredFieldError,
  isAssetNameValidationError,
  hasErrorCode,
} from './asset-name-errors';

describe('AssetNameValidationError', () => {
  it('should create error with correct properties', () => {
    const error = new AssetNameValidationError(
      'Test error message',
      'INVALID_PREFIX',
      { test: 'details' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AssetNameValidationError);
    expect(error.name).toBe('AssetNameValidationError');
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('INVALID_PREFIX');
    expect(error.details).toEqual({ test: 'details' });
  });

  it('should have proper stack trace', () => {
    const error = new AssetNameValidationError('Test', 'INVALID_PREFIX');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AssetNameValidationError');
  });

  it('should serialize to JSON correctly', () => {
    const error = new AssetNameValidationError(
      'Test error',
      'INVALID_HEX_ID',
      { id: 'INVALID' }
    );

    const json = error.toJSON();
    expect(json).toHaveProperty('name', 'AssetNameValidationError');
    expect(json).toHaveProperty('message', 'Test error');
    expect(json).toHaveProperty('code', 'INVALID_HEX_ID');
    expect(json).toHaveProperty('details', { id: 'INVALID' });
    expect(json).toHaveProperty('stack');
  });

  it('should convert to string correctly', () => {
    const error = new AssetNameValidationError(
      'Test error',
      'INVALID_LENGTH',
      { length: 40 }
    );

    const str = error.toString();
    expect(str).toContain('AssetNameValidationError');
    expect(str).toContain('INVALID_LENGTH');
    expect(str).toContain('Test error');
    expect(str).toContain('40');
  });

  it('should convert to string without details', () => {
    const error = new AssetNameValidationError('Test error', 'INVALID_PREFIX');
    const str = error.toString();
    expect(str).toBe('AssetNameValidationError [INVALID_PREFIX]: Test error');
  });
});

describe('ERROR_CODES', () => {
  it('should have all required error codes', () => {
    expect(ERROR_CODES).toHaveProperty('INVALID_PREFIX');
    expect(ERROR_CODES).toHaveProperty('INVALID_VERSION');
    expect(ERROR_CODES).toHaveProperty('INVALID_LENGTH');
    expect(ERROR_CODES).toHaveProperty('INVALID_CHARACTERS');
    expect(ERROR_CODES).toHaveProperty('INVALID_CATEGORY_CODE');
    expect(ERROR_CODES).toHaveProperty('INVALID_TIER_CODE');
    expect(ERROR_CODES).toHaveProperty('INVALID_SEASON_CODE');
    expect(ERROR_CODES).toHaveProperty('INVALID_HEX_ID');
    expect(ERROR_CODES).toHaveProperty('MISSING_REQUIRED_FIELD');
  });

  it('should have string values matching keys', () => {
    expect(ERROR_CODES.INVALID_PREFIX).toBe('INVALID_PREFIX');
    expect(ERROR_CODES.INVALID_VERSION).toBe('INVALID_VERSION');
    expect(ERROR_CODES.INVALID_LENGTH).toBe('INVALID_LENGTH');
    expect(ERROR_CODES.INVALID_CHARACTERS).toBe('INVALID_CHARACTERS');
    expect(ERROR_CODES.INVALID_CATEGORY_CODE).toBe('INVALID_CATEGORY_CODE');
    expect(ERROR_CODES.INVALID_TIER_CODE).toBe('INVALID_TIER_CODE');
    expect(ERROR_CODES.INVALID_SEASON_CODE).toBe('INVALID_SEASON_CODE');
    expect(ERROR_CODES.INVALID_HEX_ID).toBe('INVALID_HEX_ID');
    expect(ERROR_CODES.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
  });
});

describe('ERROR_MESSAGES', () => {
  it('should have messages for all error codes', () => {
    const codes = Object.keys(ERROR_CODES);
    const messages = Object.keys(ERROR_MESSAGES);
    
    expect(messages).toEqual(codes);
  });

  it('should have non-empty messages', () => {
    Object.values(ERROR_MESSAGES).forEach(message => {
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

describe('Error Factory Functions', () => {
  describe('createInvalidPrefixError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidPrefixError('WRONG_PREFIX_NAME');
      
      expect(error.code).toBe('INVALID_PREFIX');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_PREFIX);
      expect(error.details).toEqual({
        assetName: 'WRONG_PREFIX_NAME',
        expected: 'TNFT_V1_'
      });
    });
  });

  describe('createInvalidVersionError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidVersionError('V2');
      
      expect(error.code).toBe('INVALID_VERSION');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_VERSION);
      expect(error.details).toEqual({
        version: 'V2',
        expected: 'V1'
      });
    });
  });

  describe('createInvalidLengthError', () => {
    it('should create error with correct code and details', () => {
      const longName = 'TNFT_V1_SCI_REG_12b3de7d_EXTRA_LONG_SUFFIX';
      const error = createInvalidLengthError(longName);
      
      expect(error.code).toBe('INVALID_LENGTH');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_LENGTH);
      expect(error.details).toEqual({
        assetName: longName,
        length: longName.length,
        maxLength: 32
      });
    });

    it('should accept custom max length', () => {
      const error = createInvalidLengthError('TOO_LONG', 5);
      
      expect(error.details.maxLength).toBe(5);
    });
  });

  describe('createInvalidCharactersError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidCharactersError('TNFT_V1_SCI-REG_12b3de7d');
      
      expect(error.code).toBe('INVALID_CHARACTERS');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_CHARACTERS);
      expect(error.details.assetName).toBe('TNFT_V1_SCI-REG_12b3de7d');
      expect(error.details.allowed).toBe('A-Z, 0-9, underscore');
    });
  });

  describe('createInvalidCategoryCodeError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidCategoryCodeError('INVALID');
      
      expect(error.code).toBe('INVALID_CATEGORY_CODE');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_CATEGORY_CODE);
      expect(error.details.categoryCode).toBe('INVALID');
      expect(error.details.validCodes).toContain('SCI');
      expect(error.details.validCodes).toContain('ARTS');
      expect(error.details.validCodes).toHaveLength(10);
    });
  });

  describe('createInvalidTierCodeError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidTierCodeError('INVALID');
      
      expect(error.code).toBe('INVALID_TIER_CODE');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_TIER_CODE);
      expect(error.details.tierCode).toBe('INVALID');
      expect(error.details.validCodes).toEqual(['REG', 'ULT', 'MAST', 'SEAS']);
    });
  });

  describe('createInvalidSeasonCodeError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidSeasonCodeError('INVALID');
      
      expect(error.code).toBe('INVALID_SEASON_CODE');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_SEASON_CODE);
      expect(error.details.seasonCode).toBe('INVALID');
      expect(error.details.expectedFormat).toBe('WI1, SP1, SU1, FA1, etc.');
    });

    it('should handle missing season code', () => {
      const error = createInvalidSeasonCodeError();
      
      expect(error.code).toBe('INVALID_SEASON_CODE');
      expect(error.details.seasonCode).toBeUndefined();
    });
  });

  describe('createInvalidHexIdError', () => {
    it('should create error with correct code and details', () => {
      const error = createInvalidHexIdError('INVALID');
      
      expect(error.code).toBe('INVALID_HEX_ID');
      expect(error.message).toBe(ERROR_MESSAGES.INVALID_HEX_ID);
      expect(error.details.id).toBe('INVALID');
      expect(error.details.expectedFormat).toBe('8 lowercase hexadecimal characters (0-9a-f)');
    });
  });

  describe('createMissingRequiredFieldError', () => {
    it('should create error with correct code and details', () => {
      const error = createMissingRequiredFieldError('categoryCode', 'category');
      
      expect(error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(error.message).toBe(ERROR_MESSAGES.MISSING_REQUIRED_FIELD);
      expect(error.details).toEqual({
        fieldName: 'categoryCode',
        tier: 'category'
      });
    });
  });
});

describe('Type Guards', () => {
  describe('isAssetNameValidationError', () => {
    it('should return true for AssetNameValidationError instances', () => {
      const error = new AssetNameValidationError('Test', 'INVALID_PREFIX');
      expect(isAssetNameValidationError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Test');
      expect(isAssetNameValidationError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAssetNameValidationError(null)).toBe(false);
      expect(isAssetNameValidationError(undefined)).toBe(false);
      expect(isAssetNameValidationError('string')).toBe(false);
      expect(isAssetNameValidationError(123)).toBe(false);
      expect(isAssetNameValidationError({})).toBe(false);
    });
  });

  describe('hasErrorCode', () => {
    it('should return true when error has the specified code', () => {
      const error = new AssetNameValidationError('Test', 'INVALID_PREFIX');
      expect(hasErrorCode(error, 'INVALID_PREFIX')).toBe(true);
    });

    it('should return false when error has different code', () => {
      const error = new AssetNameValidationError('Test', 'INVALID_PREFIX');
      expect(hasErrorCode(error, 'INVALID_LENGTH')).toBe(false);
    });

    it('should return false for non-AssetNameValidationError', () => {
      const error = new Error('Test');
      expect(hasErrorCode(error, 'INVALID_PREFIX')).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(hasErrorCode(null, 'INVALID_PREFIX')).toBe(false);
      expect(hasErrorCode(undefined, 'INVALID_PREFIX')).toBe(false);
      expect(hasErrorCode('string', 'INVALID_PREFIX')).toBe(false);
    });
  });
});
