/**
 * Verification test for testing infrastructure setup
 * This test ensures all components of the testing infrastructure are properly configured
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createMockFileSystem } from './fixtures/mock-fs';
import * as scanner from '../scanner';
import * as referenceChecker from '../reference-checker';
import * as fileOrganizer from '../file-organizer';
import * as gitignoreManager from '../gitignore-manager';

describe('Testing Infrastructure Setup Verification', () => {
  describe('fast-check integration', () => {
    it('should run property-based tests with fast-check', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n + 0 === n;
        }),
        { numRuns: 100 }
      );
    });

    it('should support custom generators', () => {
      const arbPositiveInt = fc.integer({ min: 1, max: 1000 });
      fc.assert(
        fc.property(arbPositiveInt, (n) => {
          return n > 0;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('mock file system utilities', () => {
    it('should create and cleanup mock file systems', () => {
      const mockFs = createMockFileSystem({
        'test.txt': 'test content',
        'empty-dir/': null,
      });

      expect(mockFs.root).toBeDefined();
      expect(typeof mockFs.cleanup).toBe('function');

      mockFs.cleanup();
    });
  });

  describe('module exports', () => {
    it('should export scanner functions', () => {
      expect(scanner.scanEmptyDirectories).toBeDefined();
      expect(scanner.scanLooseAssets).toBeDefined();
      expect(scanner.scanTestArtifacts).toBeDefined();
    });

    it('should export reference checker functions', () => {
      expect(referenceChecker.findReferences).toBeDefined();
      expect(referenceChecker.isFileUsed).toBeDefined();
    });

    it('should export file organizer functions', () => {
      expect(fileOrganizer.deleteEmptyDirectory).toBeDefined();
      expect(fileOrganizer.moveFile).toBeDefined();
      expect(fileOrganizer.deleteFile).toBeDefined();
    });

    it('should export gitignore manager functions', () => {
      expect(gitignoreManager.checkPattern).toBeDefined();
      expect(gitignoreManager.addPattern).toBeDefined();
      expect(gitignoreManager.validateIgnorePatterns).toBeDefined();
    });
  });

  describe('test configuration', () => {
    it('should have vitest configured', () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('should support async tests', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });
});
