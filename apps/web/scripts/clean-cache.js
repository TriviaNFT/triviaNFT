#!/usr/bin/env node
/**
 * Clean NativeWind cache directories before build
 * This prevents Metro SHA-1 errors with react-native-css-interop cache files
 */

const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`✓ Deleted: ${folderPath}`);
    return true;
  }
  return false;
}

function findAndDeleteCacheDirs(startPath, targetDir = '.cache') {
  let deletedCount = 0;
  
  function searchDir(currentPath, depth = 0) {
    // Limit depth to prevent infinite loops
    if (depth > 10) return;
    
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        if (!item.isDirectory()) continue;
        
        const fullPath = path.join(currentPath, item.name);
        
        // If this is a .cache directory, delete it
        if (item.name === targetDir) {
          if (deleteFolderRecursive(fullPath)) {
            deletedCount++;
          }
          continue; // Don't recurse into deleted directory
        }
        
        // Recurse into subdirectories
        searchDir(fullPath, depth + 1);
      }
    } catch (err) {
      // Ignore permission errors and continue
      if (err.code !== 'EACCES' && err.code !== 'EPERM') {
        console.warn(`Warning: ${err.message}`);
      }
    }
  }
  
  searchDir(startPath);
  return deletedCount;
}

console.log('🧹 Cleaning NativeWind cache directories...');

const projectRoot = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(projectRoot, '../../node_modules');

let totalDeleted = 0;

// Clean local node_modules
if (fs.existsSync(nodeModulesPath)) {
  console.log(`\nSearching in: ${nodeModulesPath}`);
  totalDeleted += findAndDeleteCacheDirs(nodeModulesPath);
}

// Clean workspace root node_modules
if (fs.existsSync(workspaceNodeModules)) {
  console.log(`\nSearching in: ${workspaceNodeModules}`);
  totalDeleted += findAndDeleteCacheDirs(workspaceNodeModules);
}

console.log(`\n✨ Cleanup complete! Deleted ${totalDeleted} cache director${totalDeleted === 1 ? 'y' : 'ies'}.`);
