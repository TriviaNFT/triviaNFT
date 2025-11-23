#!/usr/bin/env tsx

/**
 * Pre-deployment verification script
 * Checks that all prerequisites are met before deploying to Vercel preview
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => boolean, successMsg: string, failMsg: string) {
  try {
    const passed = fn();
    results.push({
      name,
      passed,
      message: passed ? successMsg : failMsg,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: `${failMsg}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

console.log('🔍 Verifying preview deployment prerequisites...\n');

// Check 1: Git repository is clean (except tasks.md)
check(
  'Git Status',
  () => {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const lines = status.split('\n').filter(l => l.trim());
    const nonTasksChanges = lines.filter(l => !l.includes('tasks.md'));
    return nonTasksChanges.length === 0;
  },
  '✅ Git repository is clean',
  '❌ Uncommitted changes detected (excluding tasks.md)'
);

// Check 2: Vercel configuration exists
check(
  'Vercel Config',
  () => fs.existsSync('vercel.json'),
  '✅ vercel.json exists',
  '❌ vercel.json not found'
);

// Check 3: Package.json has vercel-build script
check(
  'Build Script',
  () => {
    const pkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf-8'));
    return !!pkg.scripts?.['vercel-build'];
  },
  '✅ vercel-build script configured',
  '❌ vercel-build script not found in apps/web/package.json'
);

// Check 4: Inngest endpoint exists
check(
  'Inngest Endpoint',
  () => fs.existsSync('apps/web/app/api/inngest+api.ts'),
  '✅ Inngest API endpoint exists',
  '❌ Inngest API endpoint not found'
);

// Check 5: Workflow functions exist
check(
  'Workflow Functions',
  () => {
    const mintExists = fs.existsSync('apps/web/inngest/functions/mint-workflow.ts');
    const forgeExists = fs.existsSync('apps/web/inngest/functions/forge-workflow.ts');
    return mintExists && forgeExists;
  },
  '✅ Mint and forge workflow functions exist',
  '❌ Workflow functions not found'
);

// Check 6: Environment variable documentation exists
check(
  'Environment Docs',
  () => {
    const files = ['VERCEL_ENV_SETUP.md', 'VERCEL_ENV_README.md', 'VERCEL_ENV_CHECKLIST.md'];
    return files.some(f => fs.existsSync(f));
  },
  '✅ Environment variable documentation exists',
  '⚠️  Environment variable documentation not found (optional)'
);

// Check 7: Database migration files exist
check(
  'Database Migrations',
  () => {
    const migrationsDir = 'services/api/migrations';
    if (!fs.existsSync(migrationsDir)) return false;
    const files = fs.readdirSync(migrationsDir);
    return files.length > 0;
  },
  '✅ Database migration files exist',
  '❌ No database migration files found'
);

// Check 8: Git remote is configured
check(
  'Git Remote',
  () => {
    const remotes = execSync('git remote -v', { encoding: 'utf-8' });
    return remotes.includes('origin');
  },
  '✅ Git remote configured',
  '❌ Git remote not configured'
);

// Check 9: On main branch or feature branch
check(
  'Git Branch',
  () => {
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    return branch === 'main' || branch.includes('vercel') || branch.includes('inngest');
  },
  '✅ On appropriate branch',
  '⚠️  Consider creating a feature branch for preview deployment'
);

// Check 10: TypeScript compiles
check(
  'TypeScript',
  () => {
    try {
      execSync('cd apps/web && pnpm type-check', { encoding: 'utf-8', stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },
  '✅ TypeScript compiles successfully',
  '⚠️  TypeScript errors detected (may not block deployment)'
);

// Print results
console.log('\n📊 Verification Results:\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;
let warnCount = 0;

results.forEach(result => {
  console.log(`${result.message}`);
  if (result.passed) {
    passCount++;
  } else if (result.message.startsWith('⚠️')) {
    warnCount++;
  } else {
    failCount++;
  }
});

console.log('═'.repeat(60));
console.log(`\n✅ Passed: ${passCount} | ❌ Failed: ${failCount} | ⚠️  Warnings: ${warnCount}\n`);

// Final recommendation
if (failCount === 0) {
  console.log('🚀 Ready to deploy to Vercel preview environment!\n');
  console.log('Next steps:');
  console.log('1. Create feature branch: git checkout -b vercel-inngest-migration');
  console.log('2. Commit changes: git add . && git commit -m "feat: migrate to Vercel + Inngest"');
  console.log('3. Push to remote: git push -u origin vercel-inngest-migration');
  console.log('4. Monitor deployment in Vercel dashboard');
  console.log('5. Verify Neon database branch creation');
  console.log('6. Verify Inngest sandbox environment\n');
  process.exit(0);
} else {
  console.log('⚠️  Please address the failed checks before deploying.\n');
  process.exit(1);
}
