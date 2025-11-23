/**
 * Test script for Inngest workflows
 * 
 * This script tests the mint and forge workflows locally using the Inngest Dev Server.
 * 
 * Prerequisites:
 * 1. Start the Inngest Dev Server: npx inngest-cli@latest dev
 * 2. Start the Next.js dev server: pnpm dev
 * 3. Run this script: npx tsx apps/web/inngest/test-workflows.ts
 * 
 * Requirements: 3.5, 9.3, 9.4
 */

import { inngest } from '../src/lib/inngest';
import { getPool } from '../../../services/api/src/db/connection';

/**
 * Test data for mint workflow
 */
async function testMintWorkflow() {
  console.log('\n=== Testing Mint Workflow ===\n');

  const pool = await getPool();

  try {
    // Create test eligibility
    const eligibilityResult = await pool.query(`
      INSERT INTO eligibilities (
        player_id,
        category_id,
        session_id,
        status,
        expires_at,
        created_at
      )
      SELECT 
        p.id,
        c.id,
        NULL,
        'available',
        NOW() + INTERVAL '1 hour',
        NOW()
      FROM players p
      CROSS JOIN categories c
      WHERE p.stake_key IS NOT NULL
      LIMIT 1
      RETURNING id, player_id, category_id
    `);

    if (eligibilityResult.rows.length === 0) {
      console.error('❌ Failed to create test eligibility - no players or categories found');
      return;
    }

    const eligibility = eligibilityResult.rows[0];
    console.log('✓ Created test eligibility:', eligibility.id);

    // Get player details
    const playerResult = await pool.query(
      'SELECT stake_key, payment_address FROM players WHERE id = $1',
      [eligibility.player_id]
    );

    if (playerResult.rows.length === 0) {
      console.error('❌ Failed to get player details');
      return;
    }

    const player = playerResult.rows[0];

    // Trigger mint workflow
    console.log('\n📤 Sending mint/initiated event...');
    await inngest.send({
      name: 'mint/initiated',
      data: {
        eligibilityId: eligibility.id,
        playerId: eligibility.player_id,
        stakeKey: player.stake_key,
        paymentAddress: player.payment_address || player.stake_key,
      },
    });

    console.log('✓ Mint workflow triggered successfully');
    console.log('\n📊 Check the Inngest Dev Server UI at http://localhost:8288 to see the workflow execution');
    console.log('   - Navigate to "Functions" to see registered workflows');
    console.log('   - Navigate to "Stream" to see event processing');
    console.log('   - Click on the workflow run to see step-by-step execution');

    // Wait a bit for the workflow to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check mint operation was created
    const mintResult = await pool.query(
      'SELECT id, status FROM mints WHERE eligibility_id = $1 ORDER BY created_at DESC LIMIT 1',
      [eligibility.id]
    );

    if (mintResult.rows.length > 0) {
      console.log('\n✓ Mint operation created:', {
        id: mintResult.rows[0].id,
        status: mintResult.rows[0].status,
      });
    } else {
      console.log('\n⚠️  Mint operation not yet created (workflow may still be running)');
    }

  } catch (error) {
    console.error('❌ Mint workflow test failed:', error);
  }
}

/**
 * Test data for forge workflow
 */
async function testForgeWorkflow() {
  console.log('\n=== Testing Forge Workflow ===\n');

  const pool = await getPool();

  try {
    // Get a player with NFTs
    const playerResult = await pool.query(`
      SELECT DISTINCT p.stake_key, p.payment_address
      FROM players p
      INNER JOIN player_nfts pn ON pn.stake_key = p.stake_key
      WHERE pn.burned_at IS NULL
      AND p.stake_key IS NOT NULL
      LIMIT 1
    `);

    if (playerResult.rows.length === 0) {
      console.log('⚠️  No players with NFTs found - skipping forge workflow test');
      console.log('   Run mint workflow test first to create NFTs');
      return;
    }

    const player = playerResult.rows[0];

    // Get 10 NFTs from the same category for category forge
    const nftsResult = await pool.query(`
      SELECT asset_fingerprint, category_id
      FROM player_nfts
      WHERE stake_key = $1
      AND burned_at IS NULL
      AND tier = 'category'
      ORDER BY category_id
      LIMIT 10
    `, [player.stake_key]);

    if (nftsResult.rows.length < 10) {
      console.log(`⚠️  Not enough NFTs for forge test (found ${nftsResult.rows.length}, need 10)`);
      console.log('   Run mint workflow test multiple times to create more NFTs');
      return;
    }

    const nfts = nftsResult.rows;
    const inputFingerprints = nfts.map(nft => nft.asset_fingerprint);
    const categoryId = nfts[0].category_id;

    // Check if all NFTs are from the same category
    const allSameCategory = nfts.every(nft => nft.category_id === categoryId);

    console.log('✓ Found NFTs for forge test:', {
      count: nfts.length,
      categoryId,
      allSameCategory,
    });

    // Trigger forge workflow
    console.log('\n📤 Sending forge/initiated event...');
    await inngest.send({
      name: 'forge/initiated',
      data: {
        forgeType: allSameCategory ? 'category' : 'master',
        stakeKey: player.stake_key,
        inputFingerprints,
        categoryId: allSameCategory ? categoryId : undefined,
        recipientAddress: player.payment_address || player.stake_key,
      },
    });

    console.log('✓ Forge workflow triggered successfully');
    console.log('\n📊 Check the Inngest Dev Server UI at http://localhost:8288 to see the workflow execution');

    // Wait a bit for the workflow to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check forge operation was created
    const forgeResult = await pool.query(
      'SELECT id, status, type FROM forge_operations WHERE stake_key = $1 ORDER BY created_at DESC LIMIT 1',
      [player.stake_key]
    );

    if (forgeResult.rows.length > 0) {
      console.log('\n✓ Forge operation created:', {
        id: forgeResult.rows[0].id,
        type: forgeResult.rows[0].type,
        status: forgeResult.rows[0].status,
      });
    } else {
      console.log('\n⚠️  Forge operation not yet created (workflow may still be running)');
    }

  } catch (error) {
    console.error('❌ Forge workflow test failed:', error);
  }
}

/**
 * Test workflow failure and retry behavior
 */
async function testWorkflowRetry() {
  console.log('\n=== Testing Workflow Retry Behavior ===\n');

  const pool = await getPool();

  try {
    // Test with invalid eligibility ID (should fail with NonRetriableError)
    console.log('📤 Sending mint/initiated event with invalid eligibility ID...');
    await inngest.send({
      name: 'mint/initiated',
      data: {
        eligibilityId: '00000000-0000-0000-0000-000000000000',
        playerId: '00000000-0000-0000-0000-000000000000',
        stakeKey: 'invalid_stake_key',
        paymentAddress: 'invalid_address',
      },
    });

    console.log('✓ Invalid mint workflow triggered');
    console.log('\n📊 Check the Inngest Dev Server UI to see the workflow fail with NonRetriableError');
    console.log('   - The workflow should fail immediately without retries');
    console.log('   - The error message should indicate "not found" or similar');

  } catch (error) {
    console.error('❌ Retry test failed:', error);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Inngest Workflow Test Suite\n');
  console.log('Prerequisites:');
  console.log('  1. Inngest Dev Server running at http://localhost:8288');
  console.log('  2. Next.js dev server running');
  console.log('  3. Database connection configured\n');

  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  try {
    if (testType === 'mint' || testType === 'all') {
      await testMintWorkflow();
    }

    if (testType === 'forge' || testType === 'all') {
      await testForgeWorkflow();
    }

    if (testType === 'retry' || testType === 'all') {
      await testWorkflowRetry();
    }

    console.log('\n✅ Test suite completed');
    console.log('\n💡 Tips:');
    console.log('   - Run specific tests: npx tsx apps/web/inngest/test-workflows.ts [mint|forge|retry]');
    console.log('   - Monitor workflows in real-time at http://localhost:8288');
    console.log('   - Check database records to verify workflow results');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const pool = await getPool();
    await pool.end();
  }
}

// Run tests
main();
