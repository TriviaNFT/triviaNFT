/**
 * Inngest API endpoint for workflow execution
 * 
 * This endpoint handles all Inngest workflow function invocations.
 * Inngest will call this endpoint to:
 * - Discover registered functions (GET)
 * - Execute workflow steps (POST)
 * - Handle workflow lifecycle events (PUT)
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */

import { serve } from 'inngest/next';
import { inngest } from '../../src/lib/inngest';

/**
 * Workflow functions will be imported here once they are created
 * in tasks 9 and 10:
 * - mintWorkflow (task 9)
 * - forgeWorkflow (task 10)
 */
import { mintWorkflow } from '../../inngest/functions/mint-workflow';
import { forgeWorkflow } from '../../inngest/functions/forge-workflow';

const functions: any[] = [
  mintWorkflow,
  forgeWorkflow,
];

/**
 * Serve Inngest functions via HTTP
 * 
 * This creates GET, POST, and PUT handlers that Inngest uses to:
 * - GET: Retrieve function configurations
 * - POST: Execute function steps
 * - PUT: Handle function lifecycle events
 * 
 * The signing key verifies that requests are coming from Inngest
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
