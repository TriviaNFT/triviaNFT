/**
 * Tests for file system scanner
 */

import { describe, it, expect, afterEach } from 'vitest';
import { scanEmptyDirectories, scanLooseAssets, scanTestArtifacts } from '../scanner';
import { createMockFileSystem, createEmptyDirectory } from './fixtures/mock-fs';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('File System Scanner', () => {
  const mockFileSystems: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all mock file systems
    mockFileSystems.forEach(mockFs => mockFs.cleanup());
    mockFileSystems.length = 0;
  });

  describe('scanEmptyDirectories', () => {
    it('should identify empty directories', () => {
      const mockFs = createMockFileSystem({
        'empty-dir/': null,
        'non-empty-dir/file.txt': 'content',
        'another-empty/': null,
      });
      mockFileSystems.push(mockFs);

      // Create the empty directories explicitly
      createEmptyDirectory(mockFs.root, 'empty-dir');
      createEmptyDirectory(mockFs.root, 'another-empty');

      const result = scanEmptyDirectories(mockFs.root);

      expect(result).toContain('empty-dir');
      expect(result).toContain('another-empty');
      expect(result).not.toContain('non-empty-dir');
    });

    it('should not include directories with files', () => {
      const mockFs = createMockFileSystem({
        'dir-with-file/test.txt': 'content',
      });
      mockFileSystems.push(mockFs);

      const result = scanEmptyDirectories(mockFs.root);

      expect(result).not.toContain('dir-with-file');
    });

    it('should exclude node_modules and .git directories', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      createEmptyDirectory(mockFs.root, 'node_modules');
      createEmptyDirectory(mockFs.root, '.git');
      createEmptyDirectory(mockFs.root, 'regular-empty');

      const result = scanEmptyDirectories(mockFs.root);

      expect(result).not.toContain('node_modules');
      expect(result).not.toContain('.git');
      expect(result).toContain('regular-empty');
    });

    // Feature: codebase-cleanup, Property 1: Empty directory identification accuracy
    // Validates: Requirements 1.1
    it('property: should only return directories that are truly empty', () => {
      // Generator for valid directory names (alphanumeric, hyphens, underscores)
      const validDirName = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => 
        s.length >= 1 && s.length <= 20 &&
        s !== 'node_modules' && s !== '.git' && !s.startsWith('.')
      );

      // Generator for valid file names
      const validFileName = fc.stringMatching(/^[a-zA-Z0-9_-]+\.[a-z]+$/).filter(s => 
        s.length >= 3 && s.length <= 25
      );

      fc.assert(
        fc.property(
          // Generate a structure with a mix of empty and non-empty directories
          fc.record({
            emptyDirs: fc.array(validDirName, { minLength: 0, maxLength: 5 }),
            nonEmptyDirs: fc.array(
              fc.record({
                name: validDirName,
                fileName: validFileName,
                content: fc.string({ maxLength: 100 }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          ({ emptyDirs, nonEmptyDirs }) => {
            // Get unique directory names to avoid conflicts
            const nonEmptyDirNames = new Set(nonEmptyDirs.map(d => d.name));
            const uniqueEmptyDirs = emptyDirs.filter(dir => !nonEmptyDirNames.has(dir));

            // Create mock file system
            const structure: Record<string, string | null> = {};

            // Add empty directories (only those that don't conflict)
            for (const dir of uniqueEmptyDirs) {
              structure[`${dir}/`] = null;
            }

            // Add non-empty directories
            for (const { name, fileName, content } of nonEmptyDirs) {
              structure[`${name}/${fileName}`] = content;
            }

            const mockFs = createMockFileSystem(structure);
            mockFileSystems.push(mockFs);

            try {
              // Scan for empty directories
              const result = scanEmptyDirectories(mockFs.root);

              // Verify all returned directories are actually empty
              for (const dirPath of result) {
                const fullPath = path.join(mockFs.root, dirPath);
                const entries = fs.readdirSync(fullPath);
                expect(entries.length).toBe(0);
              }

              // Verify all unique empty directories are in the result
              for (const emptyDir of uniqueEmptyDirs) {
                if (fs.existsSync(path.join(mockFs.root, emptyDir))) {
                  expect(result).toContain(emptyDir);
                }
              }

              // Verify non-empty directories are NOT in the result
              for (const { name } of nonEmptyDirs) {
                expect(result).not.toContain(name);
              }

              return true;
            } catch (error) {
              // If there's an error, the property failed
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('scanLooseAssets', () => {
    it('should identify asset files in root', () => {
      const mockFs = createMockFileSystem({
        'image.png': 'fake image',
        'video.mp4': 'fake video',
        'package.json': '{}',
        'README.md': '# README',
      });
      mockFileSystems.push(mockFs);

      const result = scanLooseAssets(mockFs.root);

      expect(result).toContain('image.png');
      expect(result).toContain('video.mp4');
      expect(result).not.toContain('package.json');
      expect(result).not.toContain('README.md');
    });

    it('should not include config files', () => {
      const mockFs = createMockFileSystem({
        'tsconfig.json': '{}',
        '.gitignore': '',
        'loose-image.jpg': 'image',
      });
      mockFileSystems.push(mockFs);

      const result = scanLooseAssets(mockFs.root);

      expect(result).not.toContain('tsconfig.json');
      expect(result).not.toContain('.gitignore');
      expect(result).toContain('loose-image.jpg');
    });
  });

  describe('scanTestArtifacts', () => {
    it('should identify HTML test files in apps/web', () => {
      const mockFs = createMockFileSystem({
        'apps/web/test-file.html': '<html></html>',
        'apps/web/another-test.html': '<html></html>',
        'apps/web/index.tsx': 'export default function() {}',
      });
      mockFileSystems.push(mockFs);

      const result = scanTestArtifacts(mockFs.root);

      // Normalize paths for cross-platform compatibility
      const normalizedResult = result.map(p => p.replace(/\\/g, '/'));

      expect(normalizedResult).toContain('apps/web/test-file.html');
      expect(normalizedResult).toContain('apps/web/another-test.html');
      expect(normalizedResult).not.toContain('apps/web/index.tsx');
    });

    it('should return empty array if apps/web does not exist', () => {
      const mockFs = createMockFileSystem({
        'other-dir/file.txt': 'content',
      });
      mockFileSystems.push(mockFs);

      const result = scanTestArtifacts(mockFs.root);

      expect(result).toEqual([]);
    });
  });
});
