/**
 * Tests for test file classifier
 */

import { describe, it, expect, afterEach } from 'vitest';
import { classifyTestFile, classifyTestFiles } from '../test-classifier';
import { createMockFileSystem } from './fixtures/mock-fs';
import fc from 'fast-check';

describe('Test File Classifier', () => {
  const mockFileSystems: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all mock file systems
    mockFileSystems.forEach(mockFs => mockFs.cleanup());
    mockFileSystems.length = 0;
  });

  describe('classifyTestFile', () => {
    it('should classify file as active-fixture when referenced in playwright.config.ts', () => {
      const mockFs = createMockFileSystem({
        'apps/web/test-file.html': '<html><body>Test</body></html>',
        'playwright.config.ts': 'webServer: { url: "test-file.html" }',
      });
      mockFileSystems.push(mockFs);

      const result = classifyTestFile('apps/web/test-file.html', mockFs.root);

      expect(result.classification).toBe('active-fixture');
      expect(result.recommendedAction).toBe('move-to-fixtures');
      expect(result.reason).toContain('test configuration');
    });

    it('should classify file as active-fixture when referenced in test files', () => {
      const mockFs = createMockFileSystem({
        'apps/web/test-page.html': '<html><body>Test</body></html>',
        'apps/web/e2e/test.spec.ts': 'await page.goto("test-page.html")',
      });
      mockFileSystems.push(mockFs);

      const result = classifyTestFile('apps/web/test-page.html', mockFs.root);

      expect(result.classification).toBe('active-fixture');
      expect(result.recommendedAction).toBe('move-to-fixtures');
    });

    it('should classify file as obsolete when not referenced', () => {
      const mockFs = createMockFileSystem({
        'apps/web/old-test.html': '<html><body>Old Test</body></html>',
        'apps/web/index.tsx': 'export default function() {}',
      });
      mockFileSystems.push(mockFs);

      const result = classifyTestFile('apps/web/old-test.html', mockFs.root);

      expect(result.classification).toBe('obsolete');
      expect(result.recommendedAction).toBe('delete');
      expect(result.reason).toContain('No references');
    });

    it('should classify file as active-fixture when referenced in __tests__ directory', () => {
      const mockFs = createMockFileSystem({
        'apps/web/fixture.html': '<html><body>Fixture</body></html>',
        'apps/web/__tests__/component.test.ts': 'const html = readFile("fixture.html")',
      });
      mockFileSystems.push(mockFs);

      const result = classifyTestFile('apps/web/fixture.html', mockFs.root);

      expect(result.classification).toBe('active-fixture');
      expect(result.recommendedAction).toBe('move-to-fixtures');
    });

    // Feature: codebase-cleanup, Property 4: File classification consistency
    // Validates: Requirements 3.1, 3.2, 3.3
    it('property: classification should be consistent with reference status', () => {
      // Generator for valid file names
      const validFileName = fc.stringMatching(/^[a-zA-Z0-9_-]+\.html$/).filter(s => 
        s.length >= 5 && s.length <= 30
      );

      // Generator for test file content
      const testFileContent = fc.string({ maxLength: 200 });

      // Generator for whether file should be referenced
      const shouldBeReferenced = fc.boolean();

      fc.assert(
        fc.property(
          validFileName,
          testFileContent,
          shouldBeReferenced,
          (fileName, content, isReferenced) => {
            // Create mock file system
            const structure: Record<string, string> = {
              [`apps/web/${fileName}`]: content,
            };

            if (isReferenced) {
              // Randomly choose between config reference or test file reference
              const useConfigRef = Math.random() > 0.5;
              
              if (useConfigRef) {
                structure['playwright.config.ts'] = `webServer: { url: "${fileName}" }`;
              } else {
                structure['apps/web/e2e/test.spec.ts'] = `await page.goto("${fileName}")`;
              }
            } else {
              // Add some unrelated files
              structure['apps/web/index.tsx'] = 'export default function() {}';
              structure['README.md'] = '# Project';
            }

            const mockFs = createMockFileSystem(structure);
            mockFileSystems.push(mockFs);

            try {
              const result = classifyTestFile(`apps/web/${fileName}`, mockFs.root);

              // Verify classification consistency
              if (isReferenced) {
                // If referenced, should be classified as active-fixture
                expect(result.classification).toBe('active-fixture');
                expect(result.recommendedAction).toBe('move-to-fixtures');
                expect(result.references.length).toBeGreaterThan(0);
              } else {
                // If not referenced, should be classified as obsolete
                expect(result.classification).toBe('obsolete');
                expect(result.recommendedAction).toBe('delete');
              }

              // Verify that classification matches recommended action
              if (result.classification === 'active-fixture') {
                expect(result.recommendedAction).toBe('move-to-fixtures');
              } else if (result.classification === 'obsolete') {
                expect(result.recommendedAction).toBe('delete');
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

  describe('classifyTestFiles', () => {
    it('should classify multiple test files', () => {
      const mockFs = createMockFileSystem({
        'apps/web/active-test.html': '<html></html>',
        'apps/web/obsolete-test.html': '<html></html>',
        'playwright.config.ts': 'url: "active-test.html"',
      });
      mockFileSystems.push(mockFs);

      const results = classifyTestFiles(
        ['apps/web/active-test.html', 'apps/web/obsolete-test.html'],
        mockFs.root
      );

      expect(results).toHaveLength(2);
      expect(results[0].classification).toBe('active-fixture');
      expect(results[1].classification).toBe('obsolete');
    });

    it('should handle empty array', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const results = classifyTestFiles([], mockFs.root);

      expect(results).toEqual([]);
    });
  });
});
