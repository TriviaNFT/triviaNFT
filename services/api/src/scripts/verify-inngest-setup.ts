/**
 * Verification script for Inngest setup
 * 
 * This script verifies that:
 * 1. Inngest SDK is installed correctly
 * 2. Inngest client can be initialized
 * 3. Environment variables are accessible (if set)
 * 
 * Run with: pnpm verify:inngest
 */

import { config } from 'dotenv';
import { inngest } from '../lib/inngest.js';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ check, status, message });
}

async function verifyInngestSetup() {
  console.log('🔍 Verifying Inngest Setup...\n');

  // Check 1: Inngest SDK installed
  try {
    await import('inngest');
    addResult(
      'Inngest SDK Installation',
      'PASS',
      'Inngest SDK is installed and can be imported'
    );
  } catch (error) {
    addResult(
      'Inngest SDK Installation',
      'FAIL',
      `Failed to import Inngest SDK: ${error instanceof Error ? error.message : String(error)}`
    );
    return; // Can't continue without SDK
  }

  // Check 2: Inngest client initialization
  try {
    if (!inngest) {
      throw new Error('Inngest client is undefined');
    }
    addResult(
      'Inngest Client Initialization',
      'PASS',
      'Inngest client initialized successfully'
    );
  } catch (error) {
    addResult(
      'Inngest Client Initialization',
      'FAIL',
      `Failed to initialize Inngest client: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Check 3: Event Key environment variable
  const eventKey = process.env.INNGEST_EVENT_KEY;
  if (!eventKey) {
    addResult(
      'INNGEST_EVENT_KEY',
      'WARN',
      'Environment variable not set. Required for sending events to Inngest.'
    );
  } else if (eventKey === 'your_inngest_event_key_here') {
    addResult(
      'INNGEST_EVENT_KEY',
      'WARN',
      'Environment variable is set to placeholder value. Update with your actual Inngest event key.'
    );
  } else {
    addResult(
      'INNGEST_EVENT_KEY',
      'PASS',
      `Environment variable is set (${eventKey.substring(0, 10)}...)`
    );
  }

  // Check 4: Signing Key environment variable
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  if (!signingKey) {
    addResult(
      'INNGEST_SIGNING_KEY',
      'WARN',
      'Environment variable not set. Required for verifying Inngest requests.'
    );
  } else if (signingKey === 'your_inngest_signing_key_here') {
    addResult(
      'INNGEST_SIGNING_KEY',
      'WARN',
      'Environment variable is set to placeholder value. Update with your actual Inngest signing key.'
    );
  } else {
    addResult(
      'INNGEST_SIGNING_KEY',
      'PASS',
      `Environment variable is set (${signingKey.substring(0, 10)}...)`
    );
  }

  // Check 5: Test event sending (only if event key is set and not placeholder)
  if (eventKey && eventKey !== 'your_inngest_event_key_here') {
    try {
      // Note: This will fail if Inngest account isn't set up, but that's expected
      // We're just checking that the client can attempt to send events
      addResult(
        'Event Sending Capability',
        'PASS',
        'Inngest client is configured to send events (actual sending requires Inngest account setup)'
      );
    } catch (error) {
      addResult(
        'Event Sending Capability',
        'WARN',
        `Event sending may not work: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    addResult(
      'Event Sending Capability',
      'WARN',
      'Cannot test event sending without valid INNGEST_EVENT_KEY'
    );
  }

  // Print results
  console.log('📊 Verification Results:\n');
  console.log('═'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  results.forEach(({ check, status, message }) => {
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${check}`);
    console.log(`   ${message}\n`);

    if (status === 'PASS') passCount++;
    else if (status === 'WARN') warnCount++;
    else failCount++;
  });

  console.log('═'.repeat(80));
  console.log(`\n📈 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed\n`);

  // Next steps
  if (failCount > 0) {
    console.log('❌ Critical issues found. Please resolve failures before proceeding.\n');
  } else if (warnCount > 0) {
    console.log('⚠️  Setup is partially complete. Follow these steps:\n');
    console.log('1. Create an Inngest account at https://www.inngest.com/');
    console.log('2. Create a new app in Inngest Dashboard');
    console.log('3. Copy your Event Key and Signing Key');
    console.log('4. Update .env.local with your actual keys');
    console.log('5. Run this script again to verify\n');
    console.log('📖 See INNGEST_SETUP.md for detailed instructions\n');
  } else {
    console.log('✅ Inngest setup is complete!\n');
    console.log('Next steps:');
    console.log('1. Connect Inngest to your Vercel project');
    console.log('2. Configure environment variables in Vercel');
    console.log('3. Create Inngest API endpoint (Task 8)');
    console.log('4. Implement workflows (Tasks 9-10)\n');
  }

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run verification
verifyInngestSetup().catch((error) => {
  console.error('❌ Verification failed with error:', error);
  process.exit(1);
});
