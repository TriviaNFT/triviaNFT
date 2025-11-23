import { Inngest } from 'inngest';

/**
 * Inngest client for TriviaNFT application
 * 
 * This client is used to:
 * - Send events to trigger workflows
 * - Define workflow functions
 * - Handle workflow execution
 * 
 * Environment variables required:
 * - INNGEST_EVENT_KEY: For sending events to Inngest
 * - INNGEST_SIGNING_KEY: For verifying Inngest requests (used in API endpoint)
 */
export const inngest = new Inngest({
  id: 'trivia-nft',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
