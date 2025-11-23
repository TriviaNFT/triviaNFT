# Inngest Setup Guide

This guide walks you through setting up Inngest for the TriviaNFT application.

## Status

- [x] Inngest SDK installed (`inngest` v3.46.0)
- [x] Inngest client created (`services/api/src/lib/inngest.ts`)
- [ ] Inngest account created
- [ ] Inngest connected to Vercel project
- [ ] Environment variables configured

## Step 1: Create Inngest Account

1. Go to https://www.inngest.com/
2. Click "Sign Up" or "Get Started"
3. Sign up using your preferred method (GitHub, Google, or email)
4. Verify your email if required

## Step 2: Create Inngest App

1. Once logged in, click "Create App" or navigate to the Apps section
2. Name your app: `trivia-nft` (or your preferred name)
3. Note down your app ID - it should match the `id` in `services/api/src/lib/inngest.ts`

## Step 3: Get Inngest Keys

You'll need two keys:

### Event Key (INNGEST_EVENT_KEY)
- Used to send events to Inngest from your application
- Found in: Inngest Dashboard → Your App → Settings → Keys → Event Key
- Copy this key - you'll add it to Vercel environment variables

### Signing Key (INNGEST_SIGNING_KEY)
- Used to verify that requests to your `/api/inngest` endpoint are from Inngest
- Found in: Inngest Dashboard → Your App → Settings → Keys → Signing Key
- Copy this key - you'll add it to Vercel environment variables

## Step 4: Connect Inngest to Vercel

### Option A: Automatic Integration (Recommended)

1. In Inngest Dashboard, go to your app settings
2. Look for "Integrations" or "Connect to Vercel"
3. Click "Connect Vercel"
4. Authorize Inngest to access your Vercel account
5. Select your TriviaNFT Vercel project
6. Inngest will automatically:
   - Set up the webhook endpoint
   - Configure environment variables
   - Create preview environments for branches

### Option B: Manual Configuration

If automatic integration isn't available:

1. In Vercel Dashboard, go to your project
2. Navigate to Settings → Environment Variables
3. Add the following variables:

   **For Development:**
   - Name: `INNGEST_EVENT_KEY`
   - Value: [Your Event Key from Step 3]
   - Environment: Development

   - Name: `INNGEST_SIGNING_KEY`
   - Value: [Your Signing Key from Step 3]
   - Environment: Development

   **For Preview:**
   - Name: `INNGEST_EVENT_KEY`
   - Value: [Your Event Key from Step 3]
   - Environment: Preview

   - Name: `INNGEST_SIGNING_KEY`
   - Value: [Your Signing Key from Step 3]
   - Environment: Preview

   **For Production:**
   - Name: `INNGEST_EVENT_KEY`
   - Value: [Your Production Event Key]
   - Environment: Production

   - Name: `INNGEST_SIGNING_KEY`
   - Value: [Your Production Signing Key]
   - Environment: Production

## Step 5: Configure Local Development

For local development, add these to your `.env.local` file:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
```

**Note:** For local development, you can also use the Inngest Dev Server which doesn't require keys:

```bash
npx inngest-cli@latest dev
```

This will start a local Inngest server at `http://localhost:8288` and provide a UI for testing workflows.

## Step 6: Verify Setup

Once you've completed the above steps, you can verify the setup by:

1. Checking that the Inngest client initializes without errors
2. Running the Inngest Dev Server locally
3. Deploying to Vercel and checking that environment variables are accessible

## Next Steps

After completing this setup:

1. ✅ Task 3 is complete
2. Move to Task 4: Configure Vercel environment variables (verify all variables are set)
3. Move to Task 7: Create Inngest client and configuration (already done)
4. Move to Task 8: Create Inngest API endpoint
5. Move to Task 9: Implement mint workflow with Inngest
6. Move to Task 10: Implement forge workflow with Inngest

## Troubleshooting

### "Event key not found" error
- Verify `INNGEST_EVENT_KEY` is set in your environment
- Check that the key is correct (no extra spaces or quotes)

### "Invalid signature" error
- Verify `INNGEST_SIGNING_KEY` is set correctly
- Ensure the signing key matches your Inngest app

### Workflows not appearing in Inngest Dashboard
- Make sure you've deployed your code with the Inngest API endpoint
- Check that workflow functions are registered in the serve() call
- Verify the webhook URL is correct in Inngest settings

## Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest + Vercel Guide](https://www.inngest.com/docs/deploy/vercel)
- [Inngest SDK Reference](https://www.inngest.com/docs/reference/typescript)
- [Inngest Dev Server](https://www.inngest.com/docs/local-development)
