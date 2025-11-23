/**
 * Reference checker for finding file references in codebase
 * 
 * This module provides utilities for checking if files are referenced
 * in the codebase before performing operations like deletion or moving.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { FileReference } from './types';

/**
 * File extensions to search for references
 */
const SEARCHABLE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.html', '.md', '.css',
  '.yml', '.yaml', '.sh', '.ps1',
];

/**
 * Directories to exclude from reference search
 */
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'layer',
  '.expo',
];

/**
 * Finds all references to a file in the codebase
 * @param filePath - The file path to search for (can be relative or absolute)
 * @param rootPath - The root directory to search from
 * @returns Array of file references
 */
export function findReferences(filePath: string, rootPath: string): FileReference[] {
  const references: FileReference[] = [];
  
  // Normalize the file path for searching
  const fileName = path.basename(filePath);
  const relativePath = path.relative(rootPath, filePath);
  
  // Build search patterns - search for filename and relative path
  const searchPatterns = [
    fileName,
    relativePath,
    relativePath.replace(/\\/g, '/'), // Unix-style path
  ];
  
  // Try to use ripgrep (rg) first, fall back to grep
  const hasRipgrep = checkCommandExists('rg');
  
  for (const pattern of searchPatterns) {
    try {
      const results = hasRipgrep 
        ? searchWithRipgrep(pattern, rootPath)
        : searchWithGrep(pattern, rootPath);
      
      references.push(...results);
    } catch (error) {
      // Continue with other patterns if one fails
      continue;
    }
  }
  
  // Remove duplicates based on filePath and lineNumber
  const uniqueRefs = Array.from(
    new Map(
      references.map(ref => [`${ref.filePath}:${ref.lineNumber}`, ref])
    ).values()
  );
  
  return uniqueRefs;
}

/**
 * Checks if a file is referenced anywhere in the codebase
 * @param filePath - The file path to check
 * @param rootPath - The root directory to search from
 * @returns True if the file is referenced, false otherwise
 */
export function isFileUsed(filePath: string, rootPath: string): boolean {
  const references = findReferences(filePath, rootPath);
  
  // Filter out self-references (the file referencing itself)
  const targetFileName = path.basename(filePath);
  const externalReferences = references.filter(ref => {
    const refFileName = path.basename(ref.filePath);
    return refFileName !== targetFileName;
  });
  
  return externalReferences.length > 0;
}

/**
 * Checks if a command exists in the system
 */
function checkCommandExists(command: string): boolean {
  try {
    const checkCmd = process.platform === 'win32' 
      ? `where ${command}`
      : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Searches for a pattern using ripgrep
 */
function searchWithRipgrep(pattern: string, rootPath: string): FileReference[] {
  const references: FileReference[] = [];
  
  // Build ripgrep command with exclusions
  const excludeArgs = EXCLUDED_DIRS.map(dir => `--glob !${dir}`).join(' ');
  
  // Escape special characters in pattern for regex
  const escapedPattern = escapeRegex(pattern);
  
  const command = `rg --line-number --no-heading --color never ${excludeArgs} "${escapedPattern}" "${rootPath}"`;
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    references.push(...parseSearchOutput(output, rootPath));
  } catch (error: any) {
    // Exit code 1 means no matches found, which is fine
    if (error.status !== 1) {
      throw error;
    }
  }
  
  return references;
}

/**
 * Searches for a pattern using grep (fallback)
 */
function searchWithGrep(pattern: string, rootPath: string): FileReference[] {
  const references: FileReference[] = [];
  
  if (process.platform === 'win32') {
    // On Windows, we need to search each file type separately
    // because findstr doesn't support the same filtering as grep
    return searchWithWindowsFindstr(pattern, rootPath);
  }
  
  // Build grep command with exclusions
  const excludeArgs = EXCLUDED_DIRS.map(dir => `--exclude-dir=${dir}`).join(' ');
  const includeArgs = SEARCHABLE_EXTENSIONS.map(ext => `--include=*${ext}`).join(' ');
  
  // Escape special characters in pattern
  const escapedPattern = escapeRegex(pattern);
  
  const command = `grep -rn ${excludeArgs} ${includeArgs} "${escapedPattern}" "${rootPath}"`;
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    references.push(...parseSearchOutput(output, rootPath));
  } catch (error: any) {
    // Exit code 1 means no matches found, which is fine
    if (error.status !== 1) {
      throw error;
    }
  }
  
  return references;
}

/**
 * Searches for a pattern using Windows findstr
 * This is a simplified search that just checks if the pattern exists in files
 */
function searchWithWindowsFindstr(pattern: string, rootPath: string): FileReference[] {
  const references: FileReference[] = [];
  
  // Recursively search files
  function searchDirectory(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (EXCLUDED_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          searchDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check if file has searchable extension
          const ext = path.extname(entry.name);
          if (!SEARCHABLE_EXTENSIONS.includes(ext)) {
            continue;
          }
          
          // Search file content
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.includes(pattern)) {
                references.push({
                  filePath: path.relative(rootPath, fullPath),
                  lineNumber: index + 1,
                  content: line.trim(),
                });
              }
            });
          } catch (error) {
            // Skip files we can't read
            continue;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }
  
  searchDirectory(rootPath);
  return references;
}

/**
 * Parses search output into FileReference objects
 */
function parseSearchOutput(output: string, rootPath: string): FileReference[] {
  const references: FileReference[] = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Parse format: filepath:lineNumber:content
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    if (match) {
      const [, filePath, lineNumber, content] = match;
      references.push({
        filePath: path.relative(rootPath, filePath),
        lineNumber: parseInt(lineNumber, 10),
        content: content.trim(),
      });
    }
  }
  
  return references;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
