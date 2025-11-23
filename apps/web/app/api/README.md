# API Routes

This directory contains Expo Router API routes for the TriviaNFT application.

## Inngest Endpoint

### Location
`app/api/inngest+api.ts`

### Purpose
This endpoint serves as the HTTP interface for Inngest workflow execution. Inngest uses this endpoint to:
- Discover registered workflow functions (GET)
- Execute workflow steps (POST)
- Handle workflow lifecycle events (PUT)

### Configuration

The endpoint requires the following environment variables:

- `INNGEST_EVENT_KEY`: Used by the Inngest client to send events
- `INNGEST_SIGNING_KEY`: Used to verify that requests are coming from Inngest

### Workflow Functions

Workflow functions are registered in the `serve()` call. Currently, the endpoint is set up with placeholders for:
- `mintWorkflow` (to be created in task 9)
- `forgeWorkflow` (to be created in task 10)

Once these workflows are implemented, they should be imported and added to the `functions` array.

### Testing Locally

To test the Inngest endpoint locally:

1. **Install Inngest CLI** (if not already installed):
   ```bash
   npx inngest-cli@latest dev
   ```

2. **Start the Inngest Dev Server**:
   ```bash
   npx inngest-cli@latest dev
   ```
   This will start a local Inngest server at `http://localhost:8288`

3. **Start your Expo app**:
   ```bash
   pnpm dev
   ```

4. **Register your endpoint** with the Inngest Dev Server:
   The Inngest Dev Server will automatically discover your endpoint at `http://localhost:8081/api/inngest`

5. **View the Inngest Dashboard**:
   Open `http://localhost:8288` in your browser to see registered functions and trigger test events

### Deployment

When deployed to Vercel:
- The endpoint will be available at `https://your-domain.vercel.app/api/inngest`
- Inngest will automatically connect to this endpoint using the signing key
- Preview deployments will create separate Inngest sandbox environments

### Requirements

This endpoint satisfies the following requirements:
- **10.1**: Exposes an Inngest API endpoint at `/api/inngest`
- **10.2**: Receives workflow execution requests from Inngest
- **10.3**: Verifies Inngest requests using signing keys
- **10.5**: Registers all workflow functions with Inngest on deployment
