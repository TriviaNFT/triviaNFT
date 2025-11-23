#!/usr/bin/env node
/**
 * Script to run the codebase cleanup orchestrator
 * 
 * Usage:
 *   pnpm tsx scripts/run-cleanup.ts --dry-run    # Preview changes
 *   pnpm tsx scripts/run-cleanup.ts              # Execute cleanup
 */

import * as path from 'path';
import { CleanupOrchestrator } from '../packages/shared/src/cleanup/orchestrator';

const isDryRun = process.argv.includes('--dry-run');
const rootPath = path.resolve(__dirname, '..');

console.log('='.repeat(60));
console.log('Codebase Cleanup Orchestrator');
console.log('='.repeat(60));
console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'EXECUTE'}`);
console.log(`Root: ${rootPath}`);
console.log('='.repeat(60));
console.log();

async function main() {
  const orchestrator = new CleanupOrchestrator({
    rootPath,
    dryRun: isDryRun,
    targetAssetDir: 'apps/web/assets',
    targetTestFixtureDir: 'apps/web/e2e/fixtures',
  });

  try {
    // Run the cleanup workflow
    const report = await orchestrator.run();

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP REPORT');
    console.log('='.repeat(60));

    console.log(`\nTasks Completed: ${report.tasksCompleted.length}`);
    console.log('-'.repeat(60));
    
    for (const task of report.tasksCompleted) {
      if (task.type === 'delete') {
        console.log(`  ❌ DELETE: ${task.source}`);
        console.log(`     Reason: ${task.reason}`);
      } else if (task.type === 'move') {
        console.log(`  📦 MOVE: ${task.source}`);
        console.log(`     To: ${task.destination}`);
        console.log(`     Reason: ${task.reason}`);
      }
      console.log();
    }

    if (report.warnings.length > 0) {
      console.log(`\nWarnings: ${report.warnings.length}`);
      console.log('-'.repeat(60));
      for (const warning of report.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
      console.log();
    }

    if (report.errors.length > 0) {
      console.log(`\nErrors: ${report.errors.length}`);
      console.log('-'.repeat(60));
      for (const error of report.errors) {
        console.log(`  ❌ ${error}`);
      }
      console.log();
    }

    console.log(`\nVerification Status: ${report.verificationStatus.toUpperCase()}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n✨ This was a DRY RUN. No changes were made.');
      console.log('   Run without --dry-run to execute the cleanup.');
    } else {
      if (report.verificationStatus === 'passed') {
        console.log('\n✅ Cleanup completed successfully!');
      } else {
        console.log('\n❌ Cleanup completed with errors. Please review.');
        process.exit(1);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error during cleanup:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
