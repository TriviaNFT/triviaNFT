# Inngest Workflows - Local Testing Guide

This guide explains how to test Inngest workflows locally using the Inngest Dev Server.

## Prerequisites

1. **Database**: Ensure your database is running and accessible
2. **Environment Variables**: Ensure `.env.local` has the required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NFT_POLICY_ID` - Cardano NFT policy ID
   - `BLOCKFROST_PROJECT_ID` - Blockfrost API key

## Setup Inngest Dev Server

The Inngest Dev Server provides a local development environment for testing workflows without deploying to production.

### Step 1: Start the Inngest Dev Server

```bash
npx inngest-cli@latest dev
```

This will:
- Start the Inngest Dev Server on `http://localhost:8288`
- Open the Inngest Dev UI in your browser
- Listen for workflow registrations from your application

**Note**: Keep this terminal window open while testing.

### Step 2: Start the Next.js Development Server

In a separate terminal:

```bash
cd apps/web
pnpm dev
```

This will:
- Start the Next.js dev server
- Register workflows with the Inngest Dev Server
- Make the `/api/inngest` endpoint available

### Step 3: Verify Workflows are Registered

1. Open the Inngest Dev UI at `http://localhost:8288`
2. Navigate to the "Functions" tab
3. You should see:
   - `mint-nft-workflow`
   - `forge-nft-workflow`

If workflows are not showing:
- Check that the Next.js dev server is running
- Check the console for any errors
- Verify the `/api/inngest` endpoint is accessible at `http://localhost:3000/api/inngest`

## Testing Workflows

### Option 1: Using the Test Script (Recommended)

Run the automated test script:

```bash
# Test all workflows
npx tsx apps/web/inngest/test-workflows.ts

# Test only mint workflow
npx tsx apps/web/inngest/test-workflows.ts mint

# Test only forge workflow
npx tsx apps/web/inngest/test-workflows.ts forge

# Test retry behavior
npx tsx apps/web/inngest/test-workflows.ts retry
```

The test script will:
- Create test data in the database
- Trigger workflows via the Inngest client
- Verify database records are created
- Provide links to view execution in the Dev UI

### Option 2: Using the Inngest Dev UI

1. Open `http://localhost:8288`
2. Navigate to "Functions"
3. Click on a workflow (e.g., `mint-nft-workflow`)
4. Click "Invoke Function"
5. Enter test event data:

**Mint Workflow Event:**
```json
{
  "name": "mint/initiated",
  "data": {
    "eligibilityId": "your-eligibility-id",
    "playerId": "your-player-id",
    "stakeKey": "your-stake-key",
    "paymentAddress": "your-payment-address"
  }
}
```

**Forge Workflow Event:**
```json
{
  "name": "forge/initiated",
  "data": {
    "forgeType": "category",
    "stakeKey": "your-stake-key",
    "inputFingerprints": ["fingerprint1", "fingerprint2", "..."],
    "categoryId": "your-category-id",
    "recipientAddress": "your-payment-address"
  }
}
```

### Option 3: Trigger from API Endpoints

Use curl or Postman to trigger workflows via the API:

```bash
# Trigger mint workflow
curl -X POST http://localhost:3000/api/mint/your-eligibility-id \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"

# Trigger forge workflow
curl -X POST http://localhost:3000/api/forge/category \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "inputFingerprints": ["fp1", "fp2", "..."],
    "categoryId": "category-id"
  }'
```

## Monitoring Workflow Execution

### Inngest Dev UI Features

1. **Stream Tab**: See all events and workflow runs in real-time
2. **Functions Tab**: View registered workflows and their configurations
3. **Runs Tab**: See detailed execution logs for each workflow run

### Viewing Workflow Details

Click on any workflow run to see:
- **Timeline**: Visual representation of step execution
- **Steps**: Each step with input/output data
- **Logs**: Console logs from each step
- **Retries**: If a step failed and was retried
- **Duration**: Time taken for each step

### Understanding Step Execution

Each workflow step is:
- **Isolated**: Failures only affect that step
- **Retriable**: Failed steps retry automatically (up to 3 times)
- **Logged**: All console.log statements appear in the UI

## Testing Failure Scenarios

### Test Retry Behavior

1. **Invalid Eligibility**: Trigger mint with non-existent eligibility ID
   - Should fail immediately with `NonRetriableError`
   - Should not retry

2. **Expired Eligibility**: Trigger mint with expired eligibility
   - Should fail at validation step
   - Should not retry

3. **Insufficient NFT Stock**: Trigger mint when no NFTs available
   - Should fail at stock check step
   - Should not retry

4. **Database Connection Error**: Temporarily stop database
   - Should retry up to 3 times
   - Should show retry attempts in UI

### Test Step Isolation

1. Trigger a workflow
2. Let it complete several steps
3. Manually fail a later step (e.g., by modifying code)
4. Verify that:
   - Only the failed step retries
   - Previous steps are not re-executed
   - Step outputs are preserved

## Verifying Database Records

After workflow execution, check the database:

### Mint Workflow

```sql
-- Check mint operation
SELECT * FROM mints WHERE eligibility_id = 'your-eligibility-id';

-- Check eligibility status
SELECT * FROM eligibilities WHERE id = 'your-eligibility-id';

-- Check player NFT
SELECT * FROM player_nfts WHERE stake_key = 'your-stake-key' ORDER BY created_at DESC LIMIT 1;
```

### Forge Workflow

```sql
-- Check forge operation
SELECT * FROM forge_operations WHERE stake_key = 'your-stake-key' ORDER BY created_at DESC LIMIT 1;

-- Check input NFTs are marked as burned
SELECT * FROM player_nfts WHERE asset_fingerprint = ANY(ARRAY['fp1', 'fp2', '...']);

-- Check output NFT was created
SELECT * FROM player_nfts WHERE stake_key = 'your-stake-key' AND tier IN ('ultimate', 'master', 'seasonal') ORDER BY created_at DESC LIMIT 1;
```

## Troubleshooting

### Workflows Not Registering

**Problem**: Workflows don't appear in Inngest Dev UI

**Solutions**:
1. Ensure Next.js dev server is running
2. Check `/api/inngest` endpoint is accessible
3. Restart both Inngest Dev Server and Next.js dev server
4. Check console for registration errors

### Workflow Fails Immediately

**Problem**: Workflow fails at first step

**Solutions**:
1. Check database connection is working
2. Verify environment variables are set
3. Check test data exists in database
4. Review error message in Inngest Dev UI

### Steps Not Retrying

**Problem**: Failed steps don't retry

**Solutions**:
1. Check if error is `NonRetriableError` (intentionally not retried)
2. Verify retry configuration in workflow function
3. Check Inngest Dev Server logs

### Database Records Not Created

**Problem**: Workflow completes but no database records

**Solutions**:
1. Check workflow execution logs in Dev UI
2. Verify database connection in each step
3. Check for transaction rollbacks
4. Review step output data

## Best Practices

1. **Use Test Data**: Create dedicated test records that can be safely deleted
2. **Monitor in Real-Time**: Keep Inngest Dev UI open while testing
3. **Check Logs**: Review console logs for each step
4. **Verify Database**: Always check database records after workflow completion
5. **Test Failures**: Intentionally trigger failures to verify retry behavior
6. **Clean Up**: Delete test records after testing

## Next Steps

After local testing is successful:
1. Deploy to Vercel preview environment
2. Test workflows in preview with Inngest sandbox
3. Monitor workflow execution in Inngest dashboard
4. Deploy to production

## Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Dev Server Guide](https://www.inngest.com/docs/local-development)
- [Workflow Testing Best Practices](https://www.inngest.com/docs/guides/testing)
