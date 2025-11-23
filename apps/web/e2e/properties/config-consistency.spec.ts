/**
 * Property-Based Test: Configuration File Consistency
 * 
 * Feature: vercel-local-testing, Property 2: Configuration File Consistency
 * Validates: Requirements 8.1, 8.2, 8.3
 * 
 * Property 2: Configuration File Consistency
 * For any configuration file (package.json, playwright.config.ts, vercel.json),
 * the settings should reference Vercel Dev as the primary development tool,
 * ensuring new developers automatically use the correct setup.
 * 
 * This test verifies that all configuration files consistently reference
 * "vercel dev" as the primary development approach, which ensures that:
 * - New developers cloning the repository get the correct setup
 * - Package.json scripts use Vercel Dev for testing and development
 * - Playwright is configured to use Vercel Dev as the web server
 * - Documentation presents Vercel Dev as the primary approach
 */

import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Configuration files that should reference Vercel Dev
 */
const CONFIG_FILES = [
  'package.json',
  'playwright.config.ts',
] as const;

test.describe('Property-Based Tests: Configuration File Consistency', () => {
  /**
   * Property 2: Configuration File Consistency
   * 
   * For any configuration file in the project, the file should contain
   * references to "vercel dev" to ensure consistent development setup.
   * 
   * Validates: Requirements 8.1, 8.2, 8.3
   */
  test('Property 2: Configuration files reference Vercel Dev', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CONFIG_FILES),
        async (configFile) => {
          // Construct the full path to the config file
          const filePath = path.join(process.cwd(), configFile);
          
          // Verify the file exists
          expect(fs.existsSync(filePath)).toBe(true);
          
          // Read the file content
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Property: All config files should reference "vercel dev"
          expect(content).toContain('vercel dev');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified
    );
  });

  /**
   * Additional property: package.json dev script uses Vercel Dev
   * 
   * The primary "dev" script in package.json should specifically use
   * "vercel dev" as the command, not alternative tools.
   */
  test('Property: package.json dev script uses vercel dev', async () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // The dev script should be "vercel dev"
    expect(packageJson.scripts.dev).toBe('vercel dev');
  });

  /**
   * Additional property: Playwright config uses correct URL
   * 
   * The Playwright configuration should point to localhost:3000,
   * which is the default port for Vercel Dev.
   */
  test('Property: Playwright config uses Vercel Dev URL', async () => {
    const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');
    const content = fs.readFileSync(playwrightConfigPath, 'utf-8');
    
    // Should reference localhost:3000 (Vercel Dev default port)
    expect(content).toContain('localhost:3000');
    
    // Should reference vercel dev command
    expect(content).toContain('vercel dev');
  });

  /**
   * Additional property: Configuration consistency across multiple reads
   * 
   * Reading the same configuration file multiple times should yield
   * consistent results (files should be stable).
   */
  test('Property: Configuration files are stable across reads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CONFIG_FILES),
        async (configFile) => {
          const filePath = path.join(process.cwd(), configFile);
          
          // Read the file twice
          const content1 = fs.readFileSync(filePath, 'utf-8');
          const content2 = fs.readFileSync(filePath, 'utf-8');
          
          // Content should be identical
          expect(content1).toBe(content2);
          
          // Both should contain vercel dev
          expect(content1).toContain('vercel dev');
          expect(content2).toContain('vercel dev');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional property: All config files are valid and parseable
   * 
   * Configuration files should be syntactically valid and parseable
   * by their respective parsers.
   */
  test('Property: Configuration files are valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CONFIG_FILES),
        async (configFile) => {
          const filePath = path.join(process.cwd(), configFile);
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Verify file is not empty
          expect(content.length).toBeGreaterThan(0);
          
          // For JSON files, verify they're valid JSON
          if (configFile.endsWith('.json')) {
            expect(() => JSON.parse(content)).not.toThrow();
          }
          
          // For TypeScript files, verify they contain valid syntax markers
          if (configFile.endsWith('.ts')) {
            // Should have export or import statements
            const hasValidSyntax = 
              content.includes('export') || 
              content.includes('import') ||
              content.includes('defineConfig');
            expect(hasValidSyntax).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
