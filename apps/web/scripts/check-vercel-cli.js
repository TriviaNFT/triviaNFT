#!/usr/bin/env node

/**
 * Pre-dev script to check if Vercel CLI is installed
 * Provides helpful error messages and installation instructions
 */

const { execSync } = require('child_process');

function checkVercelCLI() {
  try {
    // Try to run vercel --version
    execSync('vercel --version', { stdio: 'ignore' });
    // If successful, Vercel CLI is installed
    return true;
  } catch (error) {
    // Command failed, Vercel CLI is not installed
    return false;
  }
}

function main() {
  if (!checkVercelCLI()) {
    console.error('\n❌ Vercel CLI is not installed\n');
    console.error('The development server requires Vercel CLI to run.');
    console.error('\nYou have two options:\n');
    console.error('1. Install Vercel CLI globally (recommended):');
    console.error('   npm install -g vercel');
    console.error('   # or');
    console.error('   pnpm add -g vercel');
    console.error('   # or');
    console.error('   yarn global add vercel');
    console.error('\n2. Use npx (no installation required):');
    console.error('   npx vercel dev');
    console.error('\nAfter installing, you\'ll need to link your project:');
    console.error('   vercel link');
    console.error('\nFor detailed setup instructions, see: VERCEL_SETUP.md\n');
    process.exit(1);
  }
  
  // Vercel CLI is installed, continue
  console.log('✅ Vercel CLI is installed');
}

main();
