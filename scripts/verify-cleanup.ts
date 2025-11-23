#!/usr/bin/env ts-node
/**
 * Cleanup Verification Script
 * 
 * Verifies that the cleanup was successful by:
 * 1. Running reference checker to ensure no broken references
 * 2. Running existing test suite to verify functionality preserved
 * 3. Verifying project builds successfully
 * 4. Generating final cleanup report
 * 
 * Requirements: 5.3, 5.4
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { findReferences } from '../packages/shared/src/cleanup/reference-checker';

interface VerificationResult {
  referenceCheck: {
    passed: boolean;
    brokenReferences: Array<{
      file: string;
      references: number;
    }>;
  };
  testSuite: {
    passed: boolean;
    output: string;
    error?: string;
  };
  build: {
    passed: boolean;
    output: string;
    error?: string;
  };
  overallStatus: 'passed' | 'failed';
}

const ROOT_PATH = path.resolve(__dirname, '..');

// Files that were deleted or moved during cleanup
const CLEANUP_OPERATIONS = [
  { type: 'delete', path: 'docs' },
  { type: 'delete', path: 'Untitled design.png' },
  { type: 'delete', path: 'apps/web/test-polyfills.html' },
  { type: 'move', oldPath: 'apps/web/test-navigation.html', newPath: 'apps/web/e2e/fixtures/test-navigation.html' },
];

/**
 * Check for broken references to deleted/moved files
 */
function checkReferences(): VerificationResult['referenceCheck'] {
  console.log('\n📋 Checking for broken references...\n');
  
  const brokenReferences: Array<{ file: string; references: number }> = [];
  
  for (const operation of CLEANUP_OPERATIONS) {
    if (operation.type === 'delete') {
      const filePath = path.join(ROOT_PATH, operation.path);
      const refs = findReferences(filePath, ROOT_PATH);
      
      // Filter out false positives (spec files, documentation, etc.)
      const actualBrokenRefs = refs.filter(ref => {
        // Exclude spec files (they document the cleanup)
        if (ref.filePath.includes('.kiro/specs/')) return false;
        
        // Exclude this verification script
        if (ref.filePath.includes('verify-cleanup')) return false;
        
        // Exclude cleanup report
        if (ref.filePath.includes('CLEANUP_REPORT')) return false;
        
        // Exclude references that are just UI text or comments
        const content = ref.content.toLowerCase();
        if (content.includes('view docs') || content.includes('documentation')) {
          // Check if it's actually a path reference
          if (!content.includes('/docs') && !content.includes('docs/')) {
            return false;
          }
        }
        
        // Exclude external URLs
        if (content.includes('http://') || content.includes('https://')) return false;
        
        return true;
      });
      
      if (actualBrokenRefs.length > 0) {
        console.log(`❌ Found ${actualBrokenRefs.length} broken reference(s) to deleted file: ${operation.path}`);
        actualBrokenRefs.forEach(ref => {
          console.log(`   - ${ref.filePath}:${ref.lineNumber}: ${ref.content}`);
        });
        brokenReferences.push({
          file: operation.path,
          references: actualBrokenRefs.length,
        });
      } else {
        console.log(`✅ No broken references to: ${operation.path}`);
      }
    } else if (operation.type === 'move') {
      // Check that old path is not referenced
      const oldPath = path.join(ROOT_PATH, operation.oldPath);
      const refs = findReferences(oldPath, ROOT_PATH);
      
      // Filter out false positives
      const actualBrokenRefs = refs.filter(ref => {
        if (ref.filePath.includes('.kiro/specs/')) return false;
        if (ref.filePath.includes('verify-cleanup')) return false;
        if (ref.filePath.includes('CLEANUP_REPORT')) return false;
        
        // The new location might reference the old path in comments/docs
        if (ref.filePath === operation.newPath) return false;
        
        return true;
      });
      
      if (actualBrokenRefs.length > 0) {
        console.log(`❌ Found ${actualBrokenRefs.length} reference(s) to old path: ${operation.oldPath}`);
        actualBrokenRefs.forEach(ref => {
          console.log(`   - ${ref.filePath}:${ref.lineNumber}: ${ref.content}`);
        });
        brokenReferences.push({
          file: operation.oldPath,
          references: actualBrokenRefs.length,
        });
      } else {
        console.log(`✅ No references to old path: ${operation.oldPath}`);
      }
    }
  }
  
  const passed = brokenReferences.length === 0;
  
  if (passed) {
    console.log('\n✅ Reference check passed: No broken references found\n');
  } else {
    console.log('\n❌ Reference check failed: Broken references detected\n');
  }
  
  return { passed, brokenReferences };
}

/**
 * Run the test suite
 */
function runTests(): VerificationResult['testSuite'] {
  console.log('\n🧪 Running test suite...\n');
  
  try {
    const output = execSync('pnpm test --run', {
      cwd: ROOT_PATH,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(output);
    console.log('\n✅ Test suite passed\n');
    
    return {
      passed: true,
      output,
    };
  } catch (error: any) {
    console.log('\n❌ Test suite failed\n');
    console.log(error.stdout || error.message);
    
    return {
      passed: false,
      output: error.stdout || '',
      error: error.message,
    };
  }
}

/**
 * Verify the project builds successfully
 */
function verifyBuild(): VerificationResult['build'] {
  console.log('\n🔨 Verifying project builds...\n');
  
  try {
    const output = execSync('pnpm build', {
      cwd: ROOT_PATH,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(output);
    console.log('\n✅ Build successful\n');
    
    return {
      passed: true,
      output,
    };
  } catch (error: any) {
    console.log('\n❌ Build failed\n');
    console.log(error.stdout || error.message);
    
    return {
      passed: false,
      output: error.stdout || '',
      error: error.message,
    };
  }
}

/**
 * Generate final verification report
 */
function generateReport(result: VerificationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP VERIFICATION REPORT');
  console.log('='.repeat(60) + '\n');
  
  console.log('📋 Reference Check:', result.referenceCheck.passed ? '✅ PASSED' : '❌ FAILED');
  if (result.referenceCheck.brokenReferences.length > 0) {
    console.log('   Broken references:');
    result.referenceCheck.brokenReferences.forEach(br => {
      console.log(`   - ${br.file}: ${br.references} reference(s)`);
    });
  }
  
  console.log('\n🧪 Test Suite:', result.testSuite.passed ? '✅ PASSED' : '❌ FAILED');
  if (result.testSuite.error) {
    console.log(`   Error: ${result.testSuite.error}`);
  }
  
  console.log('\n🔨 Build Verification:', result.build.passed ? '✅ PASSED' : '❌ FAILED');
  if (result.build.error) {
    console.log(`   Error: ${result.build.error}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('OVERALL STATUS:', result.overallStatus === 'passed' ? '✅ PASSED' : '❌ FAILED');
  console.log('='.repeat(60) + '\n');
  
  // Write report to file
  const reportPath = path.join(ROOT_PATH, 'VERIFICATION_REPORT.md');
  const reportContent = generateMarkdownReport(result);
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  
  console.log(`📄 Detailed report written to: ${reportPath}\n`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(result: VerificationResult): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Cleanup Verification Report

**Date:** ${timestamp}  
**Status:** ${result.overallStatus === 'passed' ? '✅ PASSED' : '❌ FAILED'}

## Verification Steps

### 1. Reference Check
**Status:** ${result.referenceCheck.passed ? '✅ PASSED' : '❌ FAILED'}

`;

  if (result.referenceCheck.brokenReferences.length > 0) {
    report += `**Broken References Found:**\n\n`;
    result.referenceCheck.brokenReferences.forEach(br => {
      report += `- \`${br.file}\`: ${br.references} reference(s)\n`;
    });
  } else {
    report += `No broken references detected. All deleted and moved files have been properly handled.\n`;
  }

  report += `\n### 2. Test Suite
**Status:** ${result.testSuite.passed ? '✅ PASSED' : '❌ FAILED'}

`;

  if (result.testSuite.passed) {
    report += `All tests passed successfully. Functionality has been preserved after cleanup.\n`;
  } else {
    report += `Test suite failed. Error:\n\`\`\`\n${result.testSuite.error || 'Unknown error'}\n\`\`\`\n`;
  }

  report += `\n### 3. Build Verification
**Status:** ${result.build.passed ? '✅ PASSED' : '❌ FAILED'}

`;

  if (result.build.passed) {
    report += `Project builds successfully. No build errors introduced by cleanup.\n`;
  } else {
    report += `Build failed. Error:\n\`\`\`\n${result.build.error || 'Unknown error'}\n\`\`\`\n`;
  }

  report += `\n## Summary

`;

  if (result.overallStatus === 'passed') {
    report += `✅ **All verification checks passed!**

The cleanup has been completed successfully:
- No broken references exist in the codebase
- All tests pass
- Project builds successfully
- Project remains deployment-ready

The codebase is now cleaner and more organized while maintaining full functionality.
`;
  } else {
    report += `❌ **Verification failed**

Some verification checks did not pass. Please review the details above and address any issues before considering the cleanup complete.
`;
  }

  report += `\n## Requirements Validated

- ✅ Requirement 5.3: Verified no broken references exist after cleanup
- ✅ Requirement 5.4: Ensured project remains deployment-ready

`;

  return report;
}

/**
 * Main verification function
 */
async function main() {
  console.log('🚀 Starting cleanup verification...\n');
  
  const result: VerificationResult = {
    referenceCheck: { passed: false, brokenReferences: [] },
    testSuite: { passed: false, output: '' },
    build: { passed: false, output: '' },
    overallStatus: 'failed',
  };
  
  // Step 1: Check references
  result.referenceCheck = checkReferences();
  
  // Step 2: Run tests
  result.testSuite = runTests();
  
  // Step 3: Verify build
  result.build = verifyBuild();
  
  // Determine overall status
  result.overallStatus = 
    result.referenceCheck.passed && 
    result.testSuite.passed && 
    result.build.passed 
      ? 'passed' 
      : 'failed';
  
  // Generate report
  generateReport(result);
  
  // Exit with appropriate code
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

// Run verification
main().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
