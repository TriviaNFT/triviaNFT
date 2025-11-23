/**
 * Cleanup Orchestrator
 * 
 * Coordinates all cleanup operations including analysis, validation,
 * execution, and verification phases.
 */

import * as path from 'path';
import {
  scanEmptyDirectories,
  scanLooseAssets,
  scanTestArtifacts,
} from './scanner';
import { findReferences, isFileUsed } from './reference-checker';
import {
  deleteEmptyDirectory,
  deleteFile,
  moveFile,
  FileOperationOptions,
} from './file-organizer';
import { classifyTestFiles } from './test-classifier';
import { createGitIgnoreManager } from './gitignore-manager';
import { CleanupTask, CleanupReport } from './types';

export interface OrchestratorOptions {
  rootPath: string;
  dryRun?: boolean;
  targetAssetDir?: string;
  targetTestFixtureDir?: string;
}

export interface AnalysisResult {
  emptyDirectories: string[];
  looseAssets: string[];
  testArtifacts: string[];
  testClassifications: Array<{
    filePath: string;
    classification: 'active-fixture' | 'obsolete';
    recommendedAction: 'move-to-fixtures' | 'delete';
  }>;
  missingGitIgnorePatterns: string[];
}

/**
 * Main cleanup orchestrator that coordinates all operations
 */
export class CleanupOrchestrator {
  private options: OrchestratorOptions;
  private tasks: CleanupTask[] = [];
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(options: OrchestratorOptions) {
    this.options = {
      targetAssetDir: 'apps/web/assets',
      targetTestFixtureDir: 'apps/web/e2e/fixtures',
      dryRun: false,
      ...options,
    };
  }

  /**
   * Analysis phase: Scan and identify cleanup tasks
   */
  async analyze(): Promise<AnalysisResult> {
    const { rootPath } = this.options;

    // Scan for empty directories
    const emptyDirectories = scanEmptyDirectories(rootPath);

    // Scan for loose assets
    const looseAssets = scanLooseAssets(rootPath);

    // Scan for test artifacts
    const testArtifacts = scanTestArtifacts(rootPath);

    // Classify test files
    const classifications = classifyTestFiles(testArtifacts, rootPath);
    const testClassifications = classifications.map(c => ({
      filePath: c.filePath,
      classification: c.classification,
      recommendedAction: c.recommendedAction,
    }));

    // Check .gitignore patterns
    const missingGitIgnorePatterns = this.checkGitIgnorePatterns();

    return {
      emptyDirectories,
      looseAssets,
      testArtifacts,
      testClassifications,
      missingGitIgnorePatterns,
    };
  }

  /**
   * Validation phase: Check references for all identified files
   */
  async validate(analysis: AnalysisResult): Promise<void> {
    const { rootPath } = this.options;

    // Validate loose assets
    for (const asset of analysis.looseAssets) {
      const assetPath = path.join(rootPath, asset);
      const used = isFileUsed(assetPath, rootPath);
      
      if (used) {
        const refs = findReferences(assetPath, rootPath);
        this.warnings.push(
          `Asset "${asset}" is referenced in ${refs.length} location(s)`
        );
      }
    }

    // Validate test artifacts
    for (const testFile of analysis.testArtifacts) {
      const testPath = path.join(rootPath, testFile);
      const refs = findReferences(testPath, rootPath);
      
      if (refs.length > 0) {
        this.warnings.push(
          `Test file "${testFile}" has ${refs.length} reference(s)`
        );
      }
    }
  }

  /**
   * Execution phase: Perform file operations
   */
  async execute(analysis: AnalysisResult): Promise<void> {
    const { rootPath, dryRun, targetAssetDir, targetTestFixtureDir } = this.options;
    const options: FileOperationOptions = { rootPath, dryRun };

    // Delete empty directories
    for (const dir of analysis.emptyDirectories) {
      const result = deleteEmptyDirectory(dir, options);
      
      if (result.success && result.task) {
        this.tasks.push(result.task);
      } else if (!result.success) {
        this.errors.push(result.message);
      }
    }

    // Handle loose assets
    for (const asset of analysis.looseAssets) {
      const assetPath = path.join(rootPath, asset);
      const used = isFileUsed(assetPath, rootPath);

      if (used) {
        // Move to target asset directory
        const destPath = path.join(targetAssetDir!, asset);
        const result = moveFile(asset, destPath, options);
        
        if (result.success && result.task) {
          this.tasks.push(result.task);
        } else if (!result.success) {
          this.errors.push(result.message);
        }
      } else {
        // Delete unused asset
        const result = deleteFile(asset, options);
        
        if (result.success && result.task) {
          this.tasks.push(result.task);
        } else if (!result.success) {
          this.errors.push(result.message);
        }
      }
    }

    // Handle test artifacts based on classification
    for (const classification of analysis.testClassifications) {
      const { filePath, recommendedAction } = classification;

      if (recommendedAction === 'move-to-fixtures') {
        // Move to fixtures directory
        const fileName = path.basename(filePath);
        const destPath = path.join(targetTestFixtureDir!, fileName);
        const result = moveFile(filePath, destPath, options);
        
        if (result.success && result.task) {
          this.tasks.push(result.task);
        } else if (!result.success) {
          this.errors.push(result.message);
        }
      } else {
        // Delete obsolete test file
        const result = deleteFile(filePath, options);
        
        if (result.success && result.task) {
          this.tasks.push(result.task);
        } else if (!result.success) {
          this.errors.push(result.message);
        }
      }
    }

    // Update .gitignore patterns
    if (analysis.missingGitIgnorePatterns.length > 0 && !dryRun) {
      this.updateGitIgnorePatterns(analysis.missingGitIgnorePatterns);
    }
  }

  /**
   * Verification phase: Confirm no broken references exist
   */
  async verify(): Promise<boolean> {
    const { rootPath } = this.options;
    let allValid = true;

    // Check each completed task for broken references
    for (const task of this.tasks) {
      if (task.type === 'delete') {
        // Verify the deleted file is not referenced
        const refs = findReferences(task.source, rootPath);
        
        if (refs.length > 0) {
          this.errors.push(
            `Broken references found for deleted file "${task.source}": ${refs.length} reference(s)`
          );
          allValid = false;
        }
      } else if (task.type === 'move' && task.destination) {
        // Verify old path is not referenced
        const oldRefs = findReferences(task.source, rootPath);
        
        if (oldRefs.length > 0) {
          this.errors.push(
            `Old path still referenced after move "${task.source}": ${oldRefs.length} reference(s)`
          );
          allValid = false;
        }
      }
    }

    return allValid;
  }

  /**
   * Generate cleanup report with tasks completed and any warnings
   */
  generateReport(): CleanupReport {
    return {
      tasksCompleted: this.tasks,
      warnings: this.warnings,
      errors: this.errors,
      verificationStatus: this.errors.length === 0 ? 'passed' : 'failed',
    };
  }

  /**
   * Run the complete cleanup workflow
   */
  async run(): Promise<CleanupReport> {
    // Analysis phase
    const analysis = await this.analyze();

    // Validation phase
    await this.validate(analysis);

    // Execution phase
    await this.execute(analysis);

    // Verification phase (only if not dry run)
    if (!this.options.dryRun) {
      const verified = await this.verify();
      
      if (!verified) {
        this.errors.push('Verification failed: broken references detected');
      }
    }

    // Generate and return report
    return this.generateReport();
  }

  /**
   * Check for missing .gitignore patterns
   */
  private checkGitIgnorePatterns(): string[] {
    const { rootPath } = this.options;
    const gitignorePath = path.join(rootPath, '.gitignore');
    
    const requiredPatterns = [
      'dist/',
      'layer/',
      'build/',
      '*.log',
      '.DS_Store',
    ];

    const manager = createGitIgnoreManager(gitignorePath);
    const missing: string[] = [];

    for (const pattern of requiredPatterns) {
      if (!manager.checkPattern(pattern)) {
        missing.push(pattern);
      }
    }

    return missing;
  }

  /**
   * Update .gitignore with missing patterns
   */
  private updateGitIgnorePatterns(patterns: string[]): void {
    const { rootPath } = this.options;
    const gitignorePath = path.join(rootPath, '.gitignore');
    const manager = createGitIgnoreManager(gitignorePath);

    for (const pattern of patterns) {
      try {
        manager.addPattern(pattern, 'Build outputs');
      } catch (error: any) {
        this.warnings.push(`Failed to add pattern "${pattern}": ${error.message}`);
      }
    }
  }
}

/**
 * Convenience function to run cleanup with default options
 */
export async function runCleanup(
  rootPath: string,
  dryRun: boolean = true
): Promise<CleanupReport> {
  const orchestrator = new CleanupOrchestrator({ rootPath, dryRun });
  return orchestrator.run();
}
