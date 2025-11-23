/**
 * Tests for gitignore manager
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  createGitIgnoreManager,
  parseGitIgnore,
  rebuildGitIgnore,
  checkPattern,
  addPattern,
  validateIgnorePatterns,
} from '../gitignore-manager';
import { createMockFileSystem } from './fixtures/mock-fs';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('GitIgnore Manager', () => {
  const mockFileSystems: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all mock file systems
    mockFileSystems.forEach(mockFs => mockFs.cleanup());
    mockFileSystems.length = 0;
  });

  describe('parseGitIgnore', () => {
    it('should parse .gitignore content into sections', () => {
      const content = `# Dependencies
node_modules/
.pnp

# Build outputs
dist/
build/

# Testing
coverage/`;

      const sections = parseGitIgnore(content);

      expect(sections.size).toBe(3);
      expect(sections.has('Dependencies')).toBe(true);
      expect(sections.has('Build outputs')).toBe(true);
      expect(sections.has('Testing')).toBe(true);

      const deps = sections.get('Dependencies');
      expect(deps?.patterns).toContain('node_modules/');
      expect(deps?.patterns).toContain('.pnp');
    });

    it('should handle empty content', () => {
      const sections = parseGitIgnore('');
      expect(sections.size).toBe(0);
    });
  });

  describe('rebuildGitIgnore', () => {
    it('should rebuild content from sections', () => {
      const content = `# Dependencies
node_modules/

# Build outputs
dist/
`;

      const sections = parseGitIgnore(content);
      const rebuilt = rebuildGitIgnore(sections);

      expect(rebuilt).toContain('# Dependencies');
      expect(rebuilt).toContain('node_modules/');
      expect(rebuilt).toContain('# Build outputs');
      expect(rebuilt).toContain('dist/');
    });
  });

  describe('checkPattern', () => {
    it('should find existing patterns', () => {
      const content = `# Dependencies
node_modules/
.pnp

# Build outputs
dist/`;

      const sections = parseGitIgnore(content);

      expect(checkPattern(sections, 'node_modules/')).toBe(true);
      expect(checkPattern(sections, 'dist/')).toBe(true);
      expect(checkPattern(sections, '.pnp')).toBe(true);
    });

    it('should return false for non-existent patterns', () => {
      const content = `# Dependencies
node_modules/`;

      const sections = parseGitIgnore(content);

      expect(checkPattern(sections, 'build/')).toBe(false);
      expect(checkPattern(sections, 'coverage/')).toBe(false);
    });
  });

  describe('addPattern', () => {
    it('should add new pattern to existing section', () => {
      const content = `# Dependencies
node_modules/

# Build outputs
dist/`;

      let sections = parseGitIgnore(content);
      sections = addPattern(sections, 'build/', 'Build outputs');

      expect(checkPattern(sections, 'build/')).toBe(true);
      expect(checkPattern(sections, 'dist/')).toBe(true);
    });

    it('should create new section if it does not exist', () => {
      const content = `# Dependencies
node_modules/`;

      let sections = parseGitIgnore(content);
      sections = addPattern(sections, 'coverage/', 'Testing');

      expect(sections.has('Testing')).toBe(true);
      expect(checkPattern(sections, 'coverage/')).toBe(true);
    });

    it('should not add duplicate patterns', () => {
      const content = `# Dependencies
node_modules/`;

      let sections = parseGitIgnore(content);
      const sizeBefore = sections.get('Dependencies')?.patterns.length;

      sections = addPattern(sections, 'node_modules/', 'Dependencies');

      const sizeAfter = sections.get('Dependencies')?.patterns.length;
      expect(sizeAfter).toBe(sizeBefore);
    });
  });

  describe('validateIgnorePatterns', () => {
    it('should return true when all patterns exist', () => {
      const content = `# Dependencies
node_modules/

# Build outputs
dist/
build/`;

      const sections = parseGitIgnore(content);
      const required = ['node_modules/', 'dist/', 'build/'];

      expect(validateIgnorePatterns(sections, required)).toBe(true);
    });

    it('should return false when patterns are missing', () => {
      const content = `# Dependencies
node_modules/`;

      const sections = parseGitIgnore(content);
      const required = ['node_modules/', 'dist/', 'build/'];

      expect(validateIgnorePatterns(sections, required)).toBe(false);
    });
  });

  describe('createGitIgnoreManager', () => {
    it('should load existing .gitignore file', () => {
      const mockFs = createMockFileSystem({
        '.gitignore': `# Dependencies
node_modules/

# Build outputs
dist/`,
      });
      mockFileSystems.push(mockFs);

      const gitignorePath = path.join(mockFs.root, '.gitignore');
      const manager = createGitIgnoreManager(gitignorePath);

      expect(manager.checkPattern('node_modules/')).toBe(true);
      expect(manager.checkPattern('dist/')).toBe(true);
    });

    it('should add pattern and save to file', () => {
      const mockFs = createMockFileSystem({
        '.gitignore': `# Dependencies
node_modules/`,
      });
      mockFileSystems.push(mockFs);

      const gitignorePath = path.join(mockFs.root, '.gitignore');
      const manager = createGitIgnoreManager(gitignorePath);

      manager.addPattern('dist/', 'Build outputs');

      // Verify pattern was added
      expect(manager.checkPattern('dist/')).toBe(true);

      // Verify file was updated
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('dist/');
      expect(content).toContain('# Build outputs');
    });

    it('should validate patterns', () => {
      const mockFs = createMockFileSystem({
        '.gitignore': `# Dependencies
node_modules/

# Build outputs
dist/`,
      });
      mockFileSystems.push(mockFs);

      const gitignorePath = path.join(mockFs.root, '.gitignore');
      const manager = createGitIgnoreManager(gitignorePath);

      expect(manager.validateIgnorePatterns(['node_modules/', 'dist/'])).toBe(true);
      expect(manager.validateIgnorePatterns(['node_modules/', 'build/'])).toBe(false);
    });
  });

  // Feature: codebase-cleanup, Property 5: GitIgnore pattern preservation
  // Validates: Requirements 4.3
  describe('Property Test: Pattern Preservation', () => {
    it('property: adding new patterns should preserve all existing patterns', () => {
      // Generator for valid gitignore patterns
      const gitignorePattern = fc.oneof(
        fc.stringMatching(/^[a-zA-Z0-9_-]+\/$/).filter(s => s.length >= 2 && s.length <= 20),
        fc.stringMatching(/^\*\.[a-z]+$/).filter(s => s.length >= 3 && s.length <= 10),
        fc.stringMatching(/^[a-zA-Z0-9_-]+\.[a-z]+$/).filter(s => s.length >= 3 && s.length <= 20)
      );

      // Generator for section names
      const sectionName = fc.stringMatching(/^[A-Z][a-zA-Z ]+$/).filter(s => 
        s.length >= 3 && s.length <= 30
      );

      fc.assert(
        fc.property(
          fc.record({
            initialPatterns: fc.array(
              fc.record({
                section: sectionName,
                pattern: gitignorePattern,
              }),
              { minLength: 1, maxLength: 10 }
            ),
            newPatterns: fc.array(
              fc.record({
                section: sectionName,
                pattern: gitignorePattern,
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          ({ initialPatterns, newPatterns }) => {
            // Build initial .gitignore content
            const sectionMap = new Map<string, string[]>();
            
            for (const { section, pattern } of initialPatterns) {
              if (!sectionMap.has(section)) {
                sectionMap.set(section, []);
              }
              sectionMap.get(section)!.push(pattern);
            }

            const lines: string[] = [];
            for (const [section, patterns] of sectionMap.entries()) {
              lines.push(`# ${section}`);
              // Remove duplicates
              const uniquePatterns = [...new Set(patterns)];
              lines.push(...uniquePatterns);
              lines.push('');
            }

            const initialContent = lines.join('\n');

            // Create mock file system
            const mockFs = createMockFileSystem({
              '.gitignore': initialContent,
            });
            mockFileSystems.push(mockFs);

            const gitignorePath = path.join(mockFs.root, '.gitignore');
            const manager = createGitIgnoreManager(gitignorePath);

            // Store all initial patterns
            const initialPatternSet = new Set(
              initialPatterns.map(p => p.pattern.trim())
            );

            // Add new patterns
            for (const { section, pattern } of newPatterns) {
              manager.addPattern(pattern, section);
            }

            // Verify all initial patterns are still present
            for (const pattern of initialPatternSet) {
              expect(manager.checkPattern(pattern)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: codebase-cleanup, Property 6: Build artifact pattern coverage
  // Validates: Requirements 4.2
  describe('Property Test: Build Artifact Coverage', () => {
    it('property: after adding build artifact patterns, they should all exist in .gitignore', () => {
      // Generator for build artifact directory patterns
      const buildArtifactPattern = fc.oneof(
        fc.constantFrom('dist/', 'build/', 'layer/', 'out/', '.next/', 'coverage/'),
        fc.stringMatching(/^[a-z]+\/$/).filter(s => s.length >= 3 && s.length <= 15)
      );

      fc.assert(
        fc.property(
          fc.array(buildArtifactPattern, { minLength: 1, maxLength: 10 }),
          (buildArtifacts) => {
            // Remove duplicates
            const uniqueArtifacts = [...new Set(buildArtifacts)];

            // Create initial .gitignore with some content
            const initialContent = `# Dependencies
node_modules/

# Environment
.env`;

            const mockFs = createMockFileSystem({
              '.gitignore': initialContent,
            });
            mockFileSystems.push(mockFs);

            const gitignorePath = path.join(mockFs.root, '.gitignore');
            const manager = createGitIgnoreManager(gitignorePath);

            // Add all build artifact patterns
            for (const artifact of uniqueArtifacts) {
              manager.addPattern(artifact, 'Build outputs');
            }

            // Verify all build artifacts are now in .gitignore
            for (const artifact of uniqueArtifacts) {
              expect(manager.checkPattern(artifact)).toBe(true);
            }

            // Also verify using validateIgnorePatterns
            expect(manager.validateIgnorePatterns(uniqueArtifacts)).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
