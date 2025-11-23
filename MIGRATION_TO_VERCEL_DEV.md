# Migration Guide: Transitioning to Vercel Dev

## Overview

This guide helps existing developers migrate from the previous Metro-based development workflow to the new Vercel Dev workflow. The migration ensures your local environment matches production exactly, eliminating environment-specific bugs and streamlining testing.

## Why We're Migrating

**Previous Setup (Metro/Expo)**:
- ✅ Fast hot reload for UI development
- ❌ No API route support
- ❌ Different behavior from production
- ❌ Environment discrepancies causing bugs

**New Setup (Vercel Dev)**:
- ✅ Full production parity
- ✅ API routes work locally
- ✅ Same environment as deployment
- ✅ Inngest workflows testable locally
- ⚠️ Slightly slower startup (but worth it!)

## Migration Steps

### Step 1: Install Vercel CLI

Choose your preferred installation method:

**Option A: Global Installation (Recommended)**
```bash
npm install -g vercel
```

**Option B: Using npx (No Installation)**
```bash
# You can use npx vercel instead of vercel in all commands
npx vercel --version
```

**Verify Installation**:
```bash
vercel --version
# Should output: Vercel CLI 33.x.x or higher
```

### Step 2: Link Your Project to Vercel

Navigate to the web app directory and link to your Vercel project:

```bash
cd apps/web
vercel link
```

**You'll be prompted with**:
```
? Set up and deploy "~/path/to/trivianft/apps/web"? [Y/n]
```
Answer: `Y`

```
? Which scope do you want to deploy to?
```
Answer: Select your Vercel account/team

```
? Link to existing project? [Y/n]
```
Answer: `Y`

```
? What's the name of your existing project?
```
Answer: `trivianft-web` (or your project name)

**Success Indicator**: You should see a `.vercel` directory created in `apps/web/`

### Step 3: Set Up Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in your credentials** in `.env.local`:
   - `DATABASE_URL` - Your Neon database connection string
   - `REDIS_URL` - Your Upstash Redis URL
   - `REDIS_TOKEN` - Your Upstash Redis token
   - `INNGEST_EVENT_KEY` - Your Inngest event key
   - `INNGEST_SIGNING_KEY` - Your Inngest signing key

3. **Verify your setup**:
   ```bash
   node scripts/verify-env-vars.ts
   ```

### Step 4: Update Your Local Repository

Pull the latest changes that include the new configuration:

```bash
git pull origin main
```

This updates:
- `package.json` scripts (dev command now uses Vercel Dev)
- `playwright.config.ts` (E2E tests now use Vercel Dev)
- Documentation files

### Step 5: Start Development with Vercel Dev

```bash
cd apps/web
pnpm dev
```

**First Run**: Expect 30-60 seconds startup time as Vercel Dev initializes
**Subsequent Runs**: ~10-20 seconds

**Success Indicator**: You should see:
```
> Ready! Available at http://localhost:3000
```

### Step 6: Verify Everything Works

Run the verification script:

```bash
pnpm verify
```

This runs:
- Unit tests
- E2E tests (automatically starts Vercel Dev if needed)

## What Changed

### Commands

| Old Command | New Command | Purpose |
|------------|-------------|---------|
| `pnpm dev` (Metro) | `pnpm dev` (Vercel Dev) | Start development server |
| N/A | `pnpm dev:ui` (Metro) | Optional: UI-only rapid iteration |
| `pnpm test:e2e` | `pnpm test:e2e` | Run E2E tests (now uses Vercel Dev) |

### URLs

| Old | New | Notes |
|-----|-----|-------|
| `http://localhost:8081` | `http://localhost:3000` | Development server |
| API routes didn't work | `http://localhost:3000/api/*` | Now fully functional |

### Workflow Changes

**Before (Metro)**:
```bash
# Terminal 1
cd apps/web
pnpm dev  # Metro on :8081

# Terminal 2
# API routes don't work locally
# Had to deploy to test
```

**After (Vercel Dev)**:
```bash
# Terminal 1
cd apps/web
pnpm dev  # Vercel Dev on :3000

# Terminal 2
# Everything works locally!
pnpm test:e2e  # Tests against Vercel Dev
```

## What Stayed the Same

✅ **Project structure** - No changes to file organization
✅ **Code** - Your React components and API routes work as-is
✅ **Testing** - Same Playwright tests, just better environment
✅ **Deployment** - Still deploys to Vercel on push
✅ **Git workflow** - Same branching and PR process

## Daily Workflow

### Morning Routine

```bash
# 1. Pull latest changes
git pull

# 2. Start Vercel Dev
cd apps/web
pnpm dev

# 3. Open browser to http://localhost:3000
```

### During Development

**For UI Work**:
```bash
# Option 1: Use Vercel Dev (recommended)
pnpm dev

# Option 2: Use Metro for faster iteration (optional)
pnpm dev:ui
# Note: Must test with Vercel Dev before committing!
```

**For API Work**:
```bash
# Always use Vercel Dev
pnpm dev
```

**For Full-Stack Work**:
```bash
# Use Vercel Dev
pnpm dev
```

### Before Committing

```bash
# Run all tests
pnpm verify

# If tests pass, you're good to commit!
git add .
git commit -m "Your changes"
git push
```

## CI/CD Integration

### GitHub Actions E2E Testing

The CI pipeline now runs E2E tests using Vercel Dev to ensure production parity in automated testing.

**What Changed**:
- New `e2e-tests` job in `.github/workflows/ci.yml`
- Automatically installs Vercel CLI and Playwright
- Runs E2E tests against Vercel Dev server
- Uploads Playwright HTML reports as artifacts

**Required GitHub Secrets**:

For E2E tests to run in CI, the following secrets must be configured in your GitHub repository:

```
Repository Settings > Secrets and variables > Actions > New repository secret
```

Add these secrets:
- `DATABASE_URL` - PostgreSQL connection string for test database
- `REDIS_URL` - Redis connection URL
- `REDIS_TOKEN` - Redis authentication token
- `INNGEST_EVENT_KEY` - Inngest event key
- `INNGEST_SIGNING_KEY` - Inngest signing key

**Important**: Use test/staging credentials, never production!

**Viewing Test Results**:

When E2E tests run in CI:
1. Go to the "Actions" tab in GitHub
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download "playwright-report" to view detailed results

**CI Behavior**:
- Fresh Vercel Dev instance for each CI run (no server reuse)
- Tests run in Chromium only for speed
- 2 retries on failure (flaky test protection)
- 120-second timeout for Vercel Dev startup

For more details, see `.github/workflows/README.md`.

## FAQ

### Q: Why is Vercel Dev slower than Metro?

**A**: Vercel Dev runs the full Next.js stack with API routes, serverless functions, and production-like behavior. Metro only bundles JavaScript. The trade-off is worth it for production parity.

**Tip**: Use `reuseExistingServer: true` in Playwright config (already set) to avoid restarting the server for each test run.

### Q: Can I still use Metro for UI development?

**A**: Yes! Use `pnpm dev:ui` for rapid UI iteration. However, you **must** test with Vercel Dev (`pnpm dev`) before committing to ensure everything works in production.

### Q: What if I get "Command not found: vercel"?

**A**: Either:
1. Install globally: `npm install -g vercel`
2. Use npx: Replace `vercel` with `npx vercel` in all commands

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more details.

### Q: Do I need to link the project every time?

**A**: No! You only need to run `vercel link` once. The `.vercel` directory stores the link information.

### Q: What if my environment variables aren't loading?

**A**: Check these:
1. `.env.local` exists in `apps/web/`
2. All required variables are set (run `node scripts/verify-env-vars.ts`)
3. Restart Vercel Dev after changing `.env.local`

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

### Q: Can I use a different port?

**A**: Yes! Use the `--listen` flag:
```bash
vercel dev --listen 3001
```

Don't forget to update the URL in your browser and Playwright config.

### Q: How do I stop Vercel Dev?

**A**: Press `Ctrl+C` in the terminal where it's running.

### Q: What about the `.vercel` directory?

**A**: It's already in `.gitignore`. Don't commit it - it contains local project linking information.

### Q: Do E2E tests still work?

**A**: Yes! They work even better now. Playwright automatically starts Vercel Dev if it's not running. Just run:
```bash
pnpm test:e2e
```

### Q: What if Vercel Dev fails to start?

**A**: Common issues:
1. **Port in use**: Kill the process on port 3000 or use `--listen 3001`
2. **Not linked**: Run `vercel link` in `apps/web/`
3. **Missing env vars**: Check `.env.local` exists and is complete
4. **Database connection**: Verify `DATABASE_URL` is correct

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

### Q: How do I know if I'm using Vercel Dev correctly?

**A**: Check these indicators:
- ✅ Server runs on `http://localhost:3000`
- ✅ API routes work (e.g., `/api/health` returns JSON)
- ✅ Environment variables load from `.env.local`
- ✅ E2E tests pass with `pnpm test:e2e`

### Q: What about CI/CD?

**A**: No changes needed! CI automatically uses Vercel Dev for E2E tests. The configuration is already updated.

### Q: Can I deploy preview branches?

**A**: Yes! Same as before:
```bash
git push origin feature-branch
# Vercel automatically creates preview deployment
```

Or manually:
```bash
vercel --prod=false
```

### Q: What if I prefer the old workflow?

**A**: The old Metro workflow is still available via `pnpm dev:ui`, but:
- ⚠️ API routes won't work
- ⚠️ Environment won't match production
- ⚠️ You must test with Vercel Dev before committing

We strongly recommend adopting Vercel Dev as your primary workflow.

### Q: How do I get help?

**A**: Resources:
1. [VERCEL_SETUP.md](./VERCEL_SETUP.md) - Detailed setup guide
2. [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md) - Comprehensive workflow guide
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
4. Ask the team in Slack/Discord
5. Check Vercel CLI docs: https://vercel.com/docs/cli

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| `vercel: command not found` | `npm install -g vercel` |
| Port 3000 in use | `vercel dev --listen 3001` |
| Missing env vars | Copy `.env.local.example` to `.env.local` and fill in |
| Project not linked | `cd apps/web && vercel link` |
| Slow startup | Normal! First run takes 30-60s |
| API routes 404 | Ensure using Vercel Dev, not Metro |

For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Next Steps

1. ✅ Complete the migration steps above
2. ✅ Run `pnpm verify` to ensure everything works
3. ✅ Read [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md) for daily workflow tips
4. ✅ Bookmark [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for quick reference
5. ✅ Start building with confidence that local = production!

## Need Help?

If you encounter issues not covered here:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [VERCEL_SETUP.md](./VERCEL_SETUP.md)
3. Ask the team
4. Open an issue with details about your problem

Welcome to the new workflow! 🚀
