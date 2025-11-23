/**
 * File system scanner for identifying cleanup targets
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Directories to exclude from scanning
 */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'layer',
]);

/**
 * Checks if a directory should be excluded from scanning
 */
function shouldExcludeDirectory(dirName: string): boolean {
  return EXCLUDED_DIRS.has(dirName) || dirName.startsWith('.');
}

/**
 * Checks if a directory is empty (contains no files or subdirectories)
 */
function isDirectoryEmpty(dirPath: string): boolean {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.length === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Scans for empty directories in the specified path
 * @param rootPath - The root directory to scan
 * @returns Array of paths to empty directories
 */
export function scanEmptyDirectories(rootPath: string): string[] {
  const emptyDirs: string[] = [];

  function scanDirectory(currentPath: string, depth: number = 0): void {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Skip excluded directories
        if (shouldExcludeDirectory(entry.name)) {
          continue;
        }

        // Check if directory is empty
        if (isDirectoryEmpty(fullPath)) {
          emptyDirs.push(relativePath);
        } else {
          // Recursively scan subdirectories
          scanDirectory(fullPath, depth + 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  scanDirectory(rootPath);
  return emptyDirs;
}

/**
 * Scans for loose asset files in the root directory
 * Asset files are images, videos, and other media files that don't belong in root
 * @param rootPath - The root directory to scan
 * @returns Array of paths to loose asset files
 */
export function scanLooseAssets(rootPath: string): string[] {
  const assetExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.mp4', '.webm', '.mov',
    '.pdf', '.psd', '.ai', '.sketch',
  ]);

  const configFiles = new Set([
    'package.json',
    'tsconfig.json',
    'tsconfig.base.json',
    '.gitignore',
    '.prettierrc.json',
    '.prettierignore',
    '.eslintrc.json',
    '.npmrc',
    '.node-version',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'docker-compose.yml',
    'vitest.config.ts',
    'README.md',
    'LICENSE',
  ]);

  const looseAssets: string[] = [];

  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      // Skip config files
      if (configFiles.has(entry.name)) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();

      // Check if it's an asset file
      if (assetExtensions.has(ext)) {
        looseAssets.push(entry.name);
      }
    }
  } catch (error) {
    // Return empty array if we can't read the directory
    return [];
  }

  return looseAssets;
}

/**
 * Scans for test artifact files (HTML test files in apps/web)
 * @param rootPath - The root directory to scan
 * @returns Array of paths to test artifact files
 */
export function scanTestArtifacts(rootPath: string): string[] {
  const testArtifacts: string[] = [];
  const webAppPath = path.join(rootPath, 'apps', 'web');

  // Check if apps/web exists
  if (!fs.existsSync(webAppPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(webAppPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      // Look for HTML files that appear to be test-related
      if (entry.name.endsWith('.html')) {
        const fullPath = path.join(webAppPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        testArtifacts.push(relativePath);
      }
    }
  } catch (error) {
    // Return empty array if we can't read the directory
    return [];
  }

  return testArtifacts;
}
