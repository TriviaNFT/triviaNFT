/**
 * Check for broken references after cleanup
 */

import { findReferences } from '../packages/shared/src/cleanup/reference-checker';
import * as path from 'path';

const ROOT_PATH = path.resolve(__dirname, '..');

// Files that were deleted or moved during cleanup
const DELETED_FILES = [
  'docs',
  'Untitled design.png',
  'apps/web/test-polyfills.html',
];

const MOVED_FILES = [
  { old: 'apps/web/test-navigation.html', new: 'apps/web/e2e/fixtures/test-navigation.html' },
];

console.log('Checking for broken references...\n');

let foundIssues = false;

// Check deleted files
for (const file of DELETED_FILES) {
  const refs = findReferences(file, ROOT_PATH);
  
  // Filter out false positives
  const actualRefs = refs.filter(ref => {
    // Exclude spec files (they document the cleanup)
    if (ref.filePath.includes('.kiro/specs/')) return false;
    
    // Exclude this script and verification scripts
    if (ref.filePath.includes('scripts/')) return false;
    
    // Exclude cleanup report
    if (ref.filePath.includes('CLEANUP_REPORT') || ref.filePath.includes('VERIFICATION_REPORT')) return false;
    
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
  
  if (actualRefs.length > 0) {
    console.log(`❌ Found ${actualRefs.length} reference(s) to deleted file: ${file}`);
    actualRefs.forEach(ref => {
      console.log(`   ${ref.filePath}:${ref.lineNumber}: ${ref.content}`);
    });
    foundIssues = true;
  } else {
    console.log(`✅ No broken references to: ${file}`);
  }
}

// Check moved files (old paths should not be referenced)
for (const { old: oldPath } of MOVED_FILES) {
  const refs = findReferences(oldPath, ROOT_PATH);
  
  // Filter out false positives
  const actualRefs = refs.filter(ref => {
    if (ref.filePath.includes('.kiro/specs/')) return false;
    if (ref.filePath.includes('scripts/')) return false;
    if (ref.filePath.includes('CLEANUP_REPORT') || ref.filePath.includes('VERIFICATION_REPORT')) return false;
    return true;
  });
  
  if (actualRefs.length > 0) {
    console.log(`❌ Found ${actualRefs.length} reference(s) to old path: ${oldPath}`);
    actualRefs.forEach(ref => {
      console.log(`   ${ref.filePath}:${ref.lineNumber}: ${ref.content}`);
    });
    foundIssues = true;
  } else {
    console.log(`✅ No references to old path: ${oldPath}`);
  }
}

if (!foundIssues) {
  console.log('\n✅ No broken references found!');
  process.exit(0);
} else {
  console.log('\n❌ Broken references detected!');
  process.exit(1);
}
