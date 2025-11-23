/**
 * Type definitions for cleanup operations
 */

export interface CleanupTask {
  type: 'delete' | 'move';
  source: string;
  destination?: string;
  reason: string;
  references: string[];
  safe: boolean;
}

export interface CleanupReport {
  tasksCompleted: CleanupTask[];
  warnings: string[];
  errors: string[];
  verificationStatus: 'passed' | 'failed';
}

export interface FileReference {
  filePath: string;
  lineNumber: number;
  content: string;
}
