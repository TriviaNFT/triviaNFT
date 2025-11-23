/**
 * File organizer for safe file operations
 * 
 * This module provides utilities for safely moving and deleting files
 * with reference checking and dry-run support.
 */

import * as fs from 'fs';
import * as path from 'path';
import { findReferences, isFileUsed } from './reference-checker';
import { CleanupTask } from './types';

export interface FileOperationOptions {
  dryRun?: boolean;
  rootPath: string;
}

export interface FileOperationResult {
  success: boolean;
  message: string;
  task?: CleanupTask;
}

/**
 * Deletes an empty directory with safety checks
 * @param dirPath - Path to the directory to delete (relative to root)
 * @param options - Operation options including dry-run mode
 * @returns Result of the operation
 */
export function deleteEmptyDirectory(
  dirPath: string,
  options: FileOperationOptions
): FileOperationResult {
  const { dryRun = false, rootPath } = options;
  const fullPath = path.join(rootPath, dirPath);

  // Safety check: verify directory exists
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      message: `Directory does not exist: ${dirPath}`,
    };
  }

  // Safety check: verify it's a directory
  const stats = fs.statSync(fullPath);
  if (!stats.isDirectory()) {
    return {
      success: false,
      message: `Path is not a directory: ${dirPath}`,
    };
  }

  // Safety check: verify directory is empty
  const entries = fs.readdirSync(fullPath);
  if (entries.length > 0) {
    return {
      success: false,
      message: `Directory is not empty: ${dirPath} (contains ${entries.length} items)`,
    };
  }

  // Create task record
  const task: CleanupTask = {
    type: 'delete',
    source: dirPath,
    reason: 'Empty directory removal',
    references: [],
    safe: true,
  };

  // Dry run mode - just report what would happen
  if (dryRun) {
    return {
      success: true,
      message: `[DRY RUN] Would delete empty directory: ${dirPath}`,
      task,
    };
  }

  // Execute deletion
  try {
    fs.rmdirSync(fullPath);
    return {
      success: true,
      message: `Successfully deleted empty directory: ${dirPath}`,
      task,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete directory: ${dirPath}. Error: ${error.message}`,
    };
  }
}

/**
 * Moves a file and updates references
 * @param sourcePath - Source file path (relative to root)
 * @param destPath - Destination file path (relative to root)
 * @param options - Operation options including dry-run mode
 * @returns Result of the operation
 */
export function moveFile(
  sourcePath: string,
  destPath: string,
  options: FileOperationOptions
): FileOperationResult {
  const { dryRun = false, rootPath } = options;
  const fullSourcePath = path.join(rootPath, sourcePath);
  const fullDestPath = path.join(rootPath, destPath);

  // Safety check: verify source file exists
  if (!fs.existsSync(fullSourcePath)) {
    return {
      success: false,
      message: `Source file does not exist: ${sourcePath}`,
    };
  }

  // Safety check: verify source is a file
  const stats = fs.statSync(fullSourcePath);
  if (!stats.isFile()) {
    return {
      success: false,
      message: `Source path is not a file: ${sourcePath}`,
    };
  }

  // Safety check: verify destination doesn't already exist
  if (fs.existsSync(fullDestPath)) {
    return {
      success: false,
      message: `Destination already exists: ${destPath}`,
    };
  }

  // Find all references to this file
  const references = findReferences(fullSourcePath, rootPath);
  const referenceFiles = references.map(ref => ref.filePath);

  // Create task record
  const task: CleanupTask = {
    type: 'move',
    source: sourcePath,
    destination: destPath,
    reason: 'File organization',
    references: referenceFiles,
    safe: true,
  };

  // Dry run mode - just report what would happen
  if (dryRun) {
    const refMessage = referenceFiles.length > 0
      ? ` (${referenceFiles.length} references would be updated)`
      : ' (no references found)';
    return {
      success: true,
      message: `[DRY RUN] Would move file: ${sourcePath} -> ${destPath}${refMessage}`,
      task,
    };
  }

  // Create destination directory if it doesn't exist
  const destDir = path.dirname(fullDestPath);
  if (!fs.existsSync(destDir)) {
    try {
      fs.mkdirSync(destDir, { recursive: true });
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create destination directory: ${destDir}. Error: ${error.message}`,
      };
    }
  }

  // Execute move
  try {
    fs.renameSync(fullSourcePath, fullDestPath);

    // Update references if any exist
    if (referenceFiles.length > 0) {
      const updateResult = updateReferences(sourcePath, destPath, referenceFiles, rootPath);
      if (!updateResult.success) {
        // Move was successful but reference update failed
        // This is a warning, not a failure
        return {
          success: true,
          message: `File moved successfully: ${sourcePath} -> ${destPath}. Warning: ${updateResult.message}`,
          task,
        };
      }
    }

    return {
      success: true,
      message: `Successfully moved file: ${sourcePath} -> ${destPath}${referenceFiles.length > 0 ? ` (updated ${referenceFiles.length} references)` : ''}`,
      task,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to move file: ${sourcePath}. Error: ${error.message}`,
    };
  }
}

/**
 * Deletes a file with reference validation
 * @param filePath - Path to the file to delete (relative to root)
 * @param options - Operation options including dry-run mode
 * @returns Result of the operation
 */
export function deleteFile(
  filePath: string,
  options: FileOperationOptions
): FileOperationResult {
  const { dryRun = false, rootPath } = options;
  const fullPath = path.join(rootPath, filePath);

  // Safety check: verify file exists
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      message: `File does not exist: ${filePath}`,
    };
  }

  // Safety check: verify it's a file
  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return {
      success: false,
      message: `Path is not a file: ${filePath}`,
    };
  }

  // Check for references
  const used = isFileUsed(fullPath, rootPath);
  const references = used ? findReferences(fullPath, rootPath).map(ref => ref.filePath) : [];

  // Create task record
  const task: CleanupTask = {
    type: 'delete',
    source: filePath,
    reason: 'Unused file removal',
    references,
    safe: !used,
  };

  // If file is referenced, it's not safe to delete
  if (used) {
    return {
      success: false,
      message: `Cannot delete file: ${filePath}. File is referenced in ${references.length} location(s): ${references.slice(0, 3).join(', ')}${references.length > 3 ? '...' : ''}`,
      task,
    };
  }

  // Dry run mode - just report what would happen
  if (dryRun) {
    return {
      success: true,
      message: `[DRY RUN] Would delete unused file: ${filePath}`,
      task,
    };
  }

  // Execute deletion
  try {
    fs.unlinkSync(fullPath);
    return {
      success: true,
      message: `Successfully deleted unused file: ${filePath}`,
      task,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete file: ${filePath}. Error: ${error.message}`,
    };
  }
}

/**
 * Updates references to a moved file
 * @param oldPath - Old file path (relative to root)
 * @param newPath - New file path (relative to root)
 * @param referenceFiles - List of files that reference the moved file
 * @param rootPath - Root directory path
 * @returns Result of the update operation
 */
function updateReferences(
  oldPath: string,
  newPath: string,
  referenceFiles: string[],
  rootPath: string
): { success: boolean; message: string } {
  const errors: string[] = [];
  let updatedCount = 0;

  const oldFileName = path.basename(oldPath);
  const newFileName = path.basename(newPath);

  for (const refFile of referenceFiles) {
    const refFullPath = path.join(rootPath, refFile);

    try {
      // Read file content
      let content = fs.readFileSync(refFullPath, 'utf-8');
      let modified = false;

      // Replace references to the old path with the new path
      // Try multiple patterns: exact path, filename only, etc.
      const patterns = [
        { old: oldPath.replace(/\\/g, '/'), new: newPath.replace(/\\/g, '/') },
        { old: oldPath.replace(/\//g, '\\'), new: newPath.replace(/\//g, '\\') },
        { old: oldFileName, new: newFileName },
      ];

      for (const { old, new: newPattern } of patterns) {
        if (content.includes(old)) {
          content = content.replace(new RegExp(escapeRegExp(old), 'g'), newPattern);
          modified = true;
        }
      }

      // Write back if modified
      if (modified) {
        fs.writeFileSync(refFullPath, content, 'utf-8');
        updatedCount++;
      }
    } catch (error: any) {
      errors.push(`${refFile}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Failed to update ${errors.length} reference(s): ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`,
    };
  }

  return {
    success: true,
    message: `Updated ${updatedCount} reference(s)`,
  };
}

/**
 * Escapes special characters for use in RegExp
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
