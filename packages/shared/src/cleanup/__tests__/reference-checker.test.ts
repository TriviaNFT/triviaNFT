/**
 * Tests for reference checker
 */

import { describe, it, expect, afterEach } from 'vitest';
import { findReferences, isFileUsed } from '../reference-checker';
import { createMockFileSystem } from './fixtures/mock-fs';
import fc from 'fast-check';
import * as path from 'path';

describe('Reference Checker', () => {
  const mockFileSystems: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all mock file systems
    mockFileSystems.forEach(mockFs => mockFs.cleanup());
    mockFileSystems.length = 0;
  });

  describe('findReferences', () => {
    it('should find references to a file', () => {
      const mockFs = createMockFileSystem({
        'target.ts': 'export const value = 42;',
        'referrer.ts': 'import { value } from "./target.ts";',
        'another.ts': 'const x = 1;',
      });
      mockFileSystems.push(mockFs);

      const targetPath = path.join(mockFs.root, 'target.ts');
      const references = findReferences(targetPath, mockFs.root);

      // Should find the reference in referrer.ts
      expect(references.length).toBeGreaterThan(0);
      const hasReferrerRef = references.some(ref => 
        ref.filePath.includes('referrer.ts')
      );
      expect(hasReferrerRef).toBe(true);
    });

    it('should not find references when file is not used', () => {
      const mockFs = createMockFileSystem({
        'unused.ts': 'export const value = 42;',
        'other.ts': 'const x = 1;',
      });
      mockFileSystems.push(mockFs);

      const unusedPath = path.join(mockFs.root, 'unused.ts');
      const references = findReferences(unusedPath, mockFs.root);

      // Filter out self-references
      const externalRefs = references.filter(ref => 
        !ref.filePath.includes('unused.ts')
      );
      expect(externalRefs.length).toBe(0);
    });

    it('should find references in different file types', () => {
      const mockFs = createMockFileSystem({
        'image.png': 'fake image',
        'component.tsx': '<img src="./image.png" />',
        'styles.css': 'background: url("./image.png");',
        'readme.md': '![Image](./image.png)',
      });
      mockFileSystems.push(mockFs);

      const imagePath = path.join(mockFs.root, 'image.png');
      const references = findReferences(imagePath, mockFs.root);

      // Should find references in multiple file types
      expect(references.length).toBeGreaterThan(0);
    });
  });

  describe('isFileUsed', () => {
    it('should return true when file is referenced', () => {
      const mockFs = createMockFileSystem({
        'used.ts': 'export const value = 42;',
        'importer.ts': 'import { value } from "./used.ts";',
      });
      mockFileSystems.push(mockFs);

      const usedPath = path.join(mockFs.root, 'used.ts');
      const result = isFileUsed(usedPath, mockFs.root);

      expect(result).toBe(true);
    });

    it('should return false when file is not referenced', () => {
      const mockFs = createMockFileSystem({
        'unused.ts': 'export const value = 42;',
        'other.ts': 'const x = 1;',
      });
      mockFileSystems.push(mockFs);

      const unusedPath = path.join(mockFs.root, 'unused.ts');
      const result = isFileUsed(unusedPath, mockFs.root);

      expect(result).toBe(false);
    });

    it('should not count self-references', () => {
      const mockFs = createMockFileSystem({
        'self-ref.ts': 'const x = 1; // self-ref.ts',
      });
      mockFileSystems.push(mockFs);

      const selfRefPath = path.join(mockFs.root, 'self-ref.ts');
      const result = isFileUsed(selfRefPath, mockFs.root);

      expect(result).toBe(false);
    });

    // Feature: codebase-cleanup, Property 7: Reference checking before operations
    // Validates: Requirements 5.1
    it('property: should correctly identify referenced vs unreferenced files', () => {
      // Generator for valid file names
      const validFileName = fc.stringMatching(/^[a-zA-Z0-9_-]+\.(ts|js|tsx|jsx)$/).filter(s => 
        s.length >= 5 && s.length <= 30
      );

      // Generator for file content
      // const fileContent = fc.string({ minLength: 0, maxLength: 200 });

      fc.assert(
        fc.property(
          fc.record({
            targetFile: validFileName,
            referencingFiles: fc.array(
              fc.record({
                name: validFileName,
                shouldReference: fc.boolean(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          ({ targetFile, referencingFiles }) => {
            // Ensure unique file names
            const uniqueNames = new Set<string>();
            uniqueNames.add(targetFile);
            
            const validReferencingFiles = referencingFiles.filter(f => {
              if (f.name === targetFile || uniqueNames.has(f.name)) {
                return false;
              }
              uniqueNames.add(f.name);
              return true;
            });

            if (validReferencingFiles.length === 0) {
              return true; // Skip this test case
            }

            // Create mock file system
            const structure: Record<string, string> = {};
            
            // Add target file
            structure[targetFile] = 'export const TARGET_VALUE = 42;';
            
            // Add referencing files
            const expectedToReference = new Set<string>();
            for (const { name, shouldReference } of validReferencingFiles) {
              if (shouldReference) {
                // Include a reference to the target file
                structure[name] = `import { TARGET_VALUE } from "./${targetFile}";`;
                expectedToReference.add(name);
              } else {
                // Don't reference the target file
                structure[name] = 'const x = 1;';
              }
            }

            const mockFs = createMockFileSystem(structure);
            mockFileSystems.push(mockFs);

            try {
              const targetPath = path.join(mockFs.root, targetFile);
              
              // Test isFileUsed
              const isUsed = isFileUsed(targetPath, mockFs.root);
              const shouldBeUsed = expectedToReference.size > 0;
              
              // The file should be marked as used if and only if there are references
              expect(isUsed).toBe(shouldBeUsed);
              
              // Test findReferences
              const references = findReferences(targetPath, mockFs.root);
              
              // Filter out self-references
              const externalRefs = references.filter(ref => {
                const refFileName = path.basename(ref.filePath);
                return refFileName !== targetFile;
              });
              
              // If file should be used, we should find references
              if (shouldBeUsed) {
                expect(externalRefs.length).toBeGreaterThan(0);
                
                // Verify that files we expect to reference are found
                for (const expectedFile of expectedToReference) {
                  const found = externalRefs.some(ref => 
                    ref.filePath.includes(expectedFile)
                  );
                  expect(found).toBe(true);
                }
              } else {
                // If file should not be used, we should find no external references
                expect(externalRefs.length).toBe(0);
              }

              return true;
            } catch (error) {
              console.error('Property test failed:', error);
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
