/**
 * Test file classifier for evaluating test HTML files
 * 
 * This module provides utilities for classifying test HTML files
 * to determine if they are active fixtures or obsolete.
 */

import * as path from 'path';
import { findReferences } from './reference-checker';

/**
 * Classification result for a test file
 */
export interface TestFileClassification {
  filePath: string;
  classification: 'active-fixture' | 'obsolete';
  reason: string;
  recommendedAction: 'move-to-fixtures' | 'delete';
  references: Array<{
    filePath: string;
    lineNumber: number;
    content: string;
  }>;
}

/**
 * Files that indicate active test usage
 */
const TEST_CONFIG_FILES = [
  'playwright.config.ts',
  'playwright.config.js',
  'vitest.config.ts',
  'vitest.config.js',
];

/**
 * Directories that contain test files
 */
const TEST_DIRECTORIES = [
  'e2e',
  '__tests__',
  'test',
  'tests',
];

/**
 * Classifies a test HTML file to determine if it's an active fixture or obsolete
 * @param filePath - Path to the test HTML file (relative to root)
 * @param rootPath - Root directory of the project
 * @returns Classification result with recommended action
 */
export function classifyTestFile(
  filePath: string,
  rootPath: string
): TestFileClassification {
  // Find all references to this file
  const references = findReferences(filePath, rootPath);
  
  // Filter out self-references
  const fileName = path.basename(filePath);
  const externalReferences = references.filter(ref => {
    const refFileName = path.basename(ref.filePath);
    return refFileName !== fileName;
  });
  
  // Check if referenced in test config files
  const referencedInConfig = externalReferences.some(ref => {
    const refFileName = path.basename(ref.filePath);
    return TEST_CONFIG_FILES.includes(refFileName);
  });
  
  // Check if referenced in test files
  const referencedInTests = externalReferences.some(ref => {
    const refPath = ref.filePath.replace(/\\/g, '/');
    
    // Check if in test directory
    const inTestDir = TEST_DIRECTORIES.some(dir => refPath.includes(`/${dir}/`));
    
    // Check if file name suggests it's a test
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(ref.filePath);
    
    return inTestDir || isTestFile;
  });
  
  // Determine classification
  if (referencedInConfig || referencedInTests) {
    return {
      filePath,
      classification: 'active-fixture',
      reason: referencedInConfig
        ? 'Referenced in test configuration file'
        : 'Referenced in test files',
      recommendedAction: 'move-to-fixtures',
      references: externalReferences,
    };
  }
  
  return {
    filePath,
    classification: 'obsolete',
    reason: 'No references found in test configuration or test files',
    recommendedAction: 'delete',
    references: externalReferences,
  };
}

/**
 * Classifies multiple test HTML files
 * @param filePaths - Array of test HTML file paths
 * @param rootPath - Root directory of the project
 * @returns Array of classification results
 */
export function classifyTestFiles(
  filePaths: string[],
  rootPath: string
): TestFileClassification[] {
  return filePaths.map(filePath => classifyTestFile(filePath, rootPath));
}
