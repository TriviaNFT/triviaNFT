/**
 * Tests for file organizer
 */

import { describe, it, expect, afterEach } from 'vitest';
import { deleteEmptyDirectory, moveFile, deleteFile } from '../file-organizer';
import { createMockFileSystem, createEmptyDirectory } from './fixtures/mock-fs';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('File Organizer', () => {
  const mockFileSystems: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all mock file systems
    mockFileSystems.forEach(mockFs => mockFs.cleanup());
    mockFileSystems.length = 0;
  });

  describe('deleteEmptyDirectory', () => {
    it('should delete an empty directory', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const emptyDir = createEmptyDirectory(mockFs.root, 'empty-test');
      const relativePath = path.relative(mockFs.root, emptyDir);

      const result = deleteEmptyDirectory(relativePath, { rootPath: mockFs.root });

      expect(result.success).toBe(true);
      expect(fs.existsSync(emptyDir)).toBe(false);
    });

    it('should not delete a non-empty directory', () => {
      const mockFs = createMockFileSystem({
        'non-empty/file.txt': 'content',
      });
      mockFileSystems.push(mockFs);

      const result = deleteEmptyDirectory('non-empty', { rootPath: mockFs.root });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not empty');
      expect(fs.existsSync(path.join(mockFs.root, 'non-empty'))).toBe(true);
    });

    it('should support dry-run mode', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const emptyDir = createEmptyDirectory(mockFs.root, 'dry-run-test');
      const relativePath = path.relative(mockFs.root, emptyDir);

      const result = deleteEmptyDirectory(relativePath, {
        rootPath: mockFs.root,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(fs.existsSync(emptyDir)).toBe(true); // Should still exist
    });

    it('should fail if directory does not exist', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const result = deleteEmptyDirectory('non-existent', { rootPath: mockFs.root });

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
    });

    // Feature: codebase-cleanup, Property 2: Empty directory removal completeness
    // Validates: Requirements 1.2
    it('property: empty directory removal completeness', () => {
      // Generator for valid directory names
      const validDirName = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s =>
        s.length >= 1 && s.length <= 20
      );

      fc.assert(
        fc.property(
          fc.array(validDirName, { minLength: 1, maxLength: 10 }),
          (dirNames) => {
            // Get unique directory names
            const uniqueDirs = Array.from(new Set(dirNames));

            // Create mock file system
            const mockFs = createMockFileSystem({});
            mockFileSystems.push(mockFs);

            // Create empty directories
            const createdDirs: string[] = [];
            for (const dirName of uniqueDirs) {
              const dirPath = createEmptyDirectory(mockFs.root, dirName);
              createdDirs.push(dirPath);
            }

            // Delete each directory
            for (const dirPath of createdDirs) {
              const relativePath = path.relative(mockFs.root, dirPath);
              const result = deleteEmptyDirectory(relativePath, { rootPath: mockFs.root });

              // Verify the operation succeeded
              if (!result.success) {
                return false;
              }

              // Verify the directory no longer exists
              if (fs.existsSync(dirPath)) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('moveFile', () => {
    it('should move a file to a new location', () => {
      const mockFs = createMockFileSystem({
        'source/file.txt': 'test content',
      });
      mockFileSystems.push(mockFs);

      const result = moveFile('source/file.txt', 'dest/file.txt', {
        rootPath: mockFs.root,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(mockFs.root, 'source/file.txt'))).toBe(false);
      expect(fs.existsSync(path.join(mockFs.root, 'dest/file.txt'))).toBe(true);
    });

    it('should create destination directory if it does not exist', () => {
      const mockFs = createMockFileSystem({
        'file.txt': 'test content',
      });
      mockFileSystems.push(mockFs);

      const result = moveFile('file.txt', 'new-dir/subdir/file.txt', {
        rootPath: mockFs.root,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(mockFs.root, 'new-dir/subdir/file.txt'))).toBe(true);
    });

    it('should support dry-run mode', () => {
      const mockFs = createMockFileSystem({
        'file.txt': 'test content',
      });
      mockFileSystems.push(mockFs);

      const result = moveFile('file.txt', 'moved/file.txt', {
        rootPath: mockFs.root,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(fs.existsSync(path.join(mockFs.root, 'file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(mockFs.root, 'moved/file.txt'))).toBe(false);
    });

    it('should fail if source does not exist', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const result = moveFile('non-existent.txt', 'dest.txt', {
        rootPath: mockFs.root,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
    });

    it('should fail if destination already exists', () => {
      const mockFs = createMockFileSystem({
        'source.txt': 'source content',
        'dest.txt': 'dest content',
      });
      mockFileSystems.push(mockFs);

      const result = moveFile('source.txt', 'dest.txt', {
        rootPath: mockFs.root,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should update references when moving a file', () => {
      const mockFs = createMockFileSystem({
        'assets/image.png': 'fake image',
        'src/component.tsx': 'import image from "../assets/image.png"',
      });
      mockFileSystems.push(mockFs);

      const result = moveFile('assets/image.png', 'public/images/image.png', {
        rootPath: mockFs.root,
      });

      expect(result.success).toBe(true);

      // Check that the file was moved
      expect(fs.existsSync(path.join(mockFs.root, 'public/images/image.png'))).toBe(true);

      // Check that the reference was updated
      const componentContent = fs.readFileSync(
        path.join(mockFs.root, 'src/component.tsx'),
        'utf-8'
      );
      expect(componentContent).toContain('public/images/image.png');
      expect(componentContent).not.toContain('assets/image.png');
    });

    it('should handle special characters in directory names', () => {
      const structure: Record<string, string> = {
        '-/a.aaa': 'file content',
        'src/ref0.ts': 'import something from "../-/a.aaa"',
      };

      const mockFs = createMockFileSystem(structure);
      mockFileSystems.push(mockFs);

      const result = moveFile('-/a.aaa', '_-/a.aaa', { rootPath: mockFs.root });

      expect(result.success).toBe(true);

      // Verify the file was moved
      expect(fs.existsSync(path.join(mockFs.root, '-/a.aaa'))).toBe(false);
      expect(fs.existsSync(path.join(mockFs.root, '_-/a.aaa'))).toBe(true);

      // Verify the reference was updated
      const refContentAfter = fs.readFileSync(path.join(mockFs.root, 'src/ref0.ts'), 'utf-8');
      // Check for the exact old import path (not just substring)
      expect(refContentAfter).not.toContain('../-/a.aaa');
      expect(refContentAfter).toContain('../_-/a.aaa');
    });

    // Feature: codebase-cleanup, Property 3: Reference preservation during file moves
    // Validates: Requirements 2.5, 3.4, 5.2
    it('property: reference preservation during file moves', () => {
      // Generator for valid file names
      const validFileName = fc.stringMatching(/^[a-zA-Z0-9_-]+\.[a-z]+$/).filter(s =>
        s.length >= 5 && s.length <= 20
      );

      // Generator for valid directory names
      const validDirName = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s =>
        s.length >= 1 && s.length <= 15
      );

      fc.assert(
        fc.property(
          fc.record({
            fileName: validFileName,
            sourceDir: validDirName,
            destDir: validDirName,
            referenceCount: fc.integer({ min: 1, max: 5 }),
          }),
          ({ fileName, sourceDir, destDir, referenceCount }) => {
            // Skip if source and dest are the same
            if (sourceDir === destDir) {
              return true;
            }

            // Create mock file system
            const structure: Record<string, string> = {};

            // Add the file to be moved
            const sourcePath = `${sourceDir}/${fileName}`;
            structure[sourcePath] = 'file content';

            // Add files that reference the source file
            const referenceFiles: string[] = [];
            for (let i = 0; i < referenceCount; i++) {
              const refFileName = `ref${i}.ts`;
              const refPath = `src/${refFileName}`;
              structure[refPath] = `import something from "../${sourcePath}"`;
              referenceFiles.push(refPath);
            }

            const mockFs = createMockFileSystem(structure);
            mockFileSystems.push(mockFs);

            try {
              // Move the file
              const destPath = `${destDir}/${fileName}`;
              const result = moveFile(sourcePath, destPath, { rootPath: mockFs.root });

              // Verify the move succeeded
              if (!result.success) {
                return false;
              }

              // Verify the file was moved
              if (fs.existsSync(path.join(mockFs.root, sourcePath))) {
                return false;
              }
              if (!fs.existsSync(path.join(mockFs.root, destPath))) {
                return false;
              }

              // Verify all references were updated
              for (const refFile of referenceFiles) {
                const refFullPath = path.join(mockFs.root, refFile);
                const content = fs.readFileSync(refFullPath, 'utf-8');

                // Check that the old import path is no longer referenced
                // We need to check for the actual import pattern, not just the path substring
                const oldImportPath = `../${sourcePath}`;
                const newImportPath = `../${destPath}`;

                if (content.includes(oldImportPath)) {
                  return false;
                }

                // Check that the new path is referenced
                if (!content.includes(newImportPath)) {
                  return false;
                }
              }

              return true;
            } catch (error) {
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete an unused file', () => {
      const mockFs = createMockFileSystem({
        'unused.txt': 'content',
      });
      mockFileSystems.push(mockFs);

      const result = deleteFile('unused.txt', { rootPath: mockFs.root });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(mockFs.root, 'unused.txt'))).toBe(false);
    });

    it('should not delete a file that is referenced', () => {
      const mockFs = createMockFileSystem({
        'used.txt': 'content',
        'reference.ts': 'import "./used.txt"',
      });
      mockFileSystems.push(mockFs);

      const result = deleteFile('used.txt', { rootPath: mockFs.root });

      expect(result.success).toBe(false);
      expect(result.message).toContain('referenced');
      expect(fs.existsSync(path.join(mockFs.root, 'used.txt'))).toBe(true);
    });

    it('should support dry-run mode', () => {
      const mockFs = createMockFileSystem({
        'file.txt': 'content',
      });
      mockFileSystems.push(mockFs);

      const result = deleteFile('file.txt', {
        rootPath: mockFs.root,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(fs.existsSync(path.join(mockFs.root, 'file.txt'))).toBe(true);
    });

    it('should fail if file does not exist', () => {
      const mockFs = createMockFileSystem({});
      mockFileSystems.push(mockFs);

      const result = deleteFile('non-existent.txt', { rootPath: mockFs.root });

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
    });
  });
});
