/**
 * Mock file system utilities for testing
 * 
 * This module provides utilities for creating mock file systems
 * for testing cleanup operations without touching real files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MockFileSystem {
  root: string;
  cleanup: () => void;
}

/**
 * Creates a temporary directory structure for testing
 */
export function createMockFileSystem(structure: Record<string, string | null>): MockFileSystem {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));

  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(root, filePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create file if content is provided, otherwise just create directory
    if (content !== null) {
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }

  return {
    root,
    cleanup: () => {
      if (fs.existsSync(root)) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Creates an empty directory structure for testing
 */
export function createEmptyDirectory(parentPath: string, dirName: string): string {
  const dirPath = path.join(parentPath, dirName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Checks if a directory is empty
 */
export function isDirectoryEmpty(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  const files = fs.readdirSync(dirPath);
  return files.length === 0;
}

/**
 * Creates a file with content
 */
export function createFile(dirPath: string, fileName: string, content: string): string {
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
