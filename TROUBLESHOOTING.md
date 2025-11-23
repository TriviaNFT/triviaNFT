# Troubleshooting Guide

This guide covers common issues you may encounter when working with Vercel Dev and provides platform-specific solutions.

## Table of Contents

- [Command Not Found: vercel](#command-not-found-vercel)
- [Port 3000 Already in Use](#port-3000-already-in-use)
- [Environment Variables Not Found](#environment-variables-not-found)
- [Vercel Project Not Linked](#vercel-project-not-linked)
- [Slow Startup](#slow-startup)
- [Database Connection Failures](#database-connection-failures)

---

## Command Not Found: vercel

### Problem

When you try to run `vercel dev`, you see:

```bash
# Windows
'vercel' is not recognized as an internal or external command

# macOS/Linux
bash: vercel: command not found
zsh: command not found: vercel
```

### Solution 1: Install Vercel CLI Globally

**Windows (PowerShell/CMD):**
```powershell
npm install -g vercel
```

**macOS/Linux:**
```bash
npm install -g vercel
# or with sudo if needed
sudo npm install -g vercel
```

**Verify installation:**
```bash
vercel --version
```

### Solution 2: Use npx (No Installation Required)

If you don't want to install globally, use `npx`:

```bash
npx vercel dev
```

**Note:** Using `npx` will be slower as it downloads the package each time.

### Solution 3: Check PATH Configuration

If you installed Vercel CLI but still get "command not found":

**Windows:**
1. Check npm global path: `npm config get prefix`
2. Add that path to your System Environment Variables
3. Restart your terminal

**macOS/Linux:**
1. Check npm global path: `npm config get prefix`
2. Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
   ```bash
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```
3. Reload your shell: `source ~/.bashrc` or `source ~/.zshrc`

---

## Port 3000 Already in Use

### Problem

When starting Vercel Dev, you see:

```bash
Error: Port 3000 is already in use
```

### Solution 1: Find and Kill the Process

**Windows (PowerShell):**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

**Windows (CMD):**
```cmd
# Find the process
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
# Find the process using port 3000
lsof -i :3000

# Kill the process (replace <PID> with the actual process ID)
kill -9 <PID>

# Or use a one-liner
lsof -ti :3000 | xargs kill -9
```

### Solution 2: Use a Different Port

Start Vercel Dev on an alternative port:

```bash
vercel dev --listen 3001
```

**Important:** If you change the port, update your Playwright configuration:

```typescript
// apps/web/playwright.config.ts
webServer: {
  command: 'vercel dev --listen 3001',
  url: 'http://localhost:3001',
  // ...
}
```

### Solution 3: Check for Background Processes

Sometimes Vercel Dev doesn't shut down cleanly:

**Windows:**
```powershell
# List all node processes
tasklist | findstr node

# Kill all node processes (use with caution)
taskkill /IM node.exe /F
```

**macOS/Linux:**
```bash
# List all node processes
ps aux | grep node

# Kill all node processes (use with caution)
pkill -9 node
```

---

## Environment Variables Not Found

### Problem

Your application fails to start or behaves incorrectly with errors like:

```bash
Error: Missing required environment variable: DATABASE_URL
Error: Environment variable REDIS_URL is not defined
```

### Solution 1: Create .env.local File

1. Navigate to your web app directory:
   ```bash
   cd apps/web
   ```

2. Create a `.env.local` file (if it doesn't exist):
   ```bash
   # Windows
   type nul > .env.local

   # macOS/Linux
   touch .env.local
   ```

3. Add required environment variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database

   # Redis
   REDIS_URL=https://your-redis-instance.upstash.io
   REDIS_TOKEN=your-redis-token

   # Inngest
   INNGEST_EVENT_KEY=your-inngest-event-key
   INNGEST_SIGNING_KEY=your-inngest-signing-key
   ```

### Solution 2: Validate Environment Variables

Run the validation script to check which variables are missing:

```bash
cd apps/web
pnpm tsx ../../scripts/verify-env-vars.ts
```

This will show you exactly which variables are missing and where to find them.

### Solution 3: Pull from Vercel

If your project is already deployed to Vercel, you can pull environment variables:

```bash
cd apps/web
vercel env pull .env.local
```

This downloads all environment variables from your Vercel project.

### Solution 4: Check .gitignore

Ensure `.env.local` is in your `.gitignore` file:

```bash
# Check if .env.local is gitignored
git check-ignore .env.local
```

If it's not ignored, add it to `.gitignore`:

```gitignore
# Environment variables
.env.local
.env*.local
```

### Where to Get Credentials

- **DATABASE_URL**: From your database provider (Neon, Supabase, etc.)
- **REDIS_URL & REDIS_TOKEN**: From Upstash Redis dashboard
- **INNGEST_EVENT_KEY & INNGEST_SIGNING_KEY**: From Inngest dashboard

See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for detailed instructions on obtaining these credentials.

---

## Vercel Project Not Linked

### Problem

When running `vercel dev`, you see:

```bash
Error: No Vercel project linked
Error: The specified scope does not exist
```

### Solution 1: Link Your Project

Run the link command and follow the prompts:

```bash
cd apps/web
vercel link
```

You'll be asked:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Select your Vercel account/team
3. **Link to existing project?** → Yes (if project exists) or No (to create new)
4. **Project name?** → Select or enter your project name

### Solution 2: Verify Link Status

Check if your project is linked:

```bash
# Check for .vercel directory
ls -la .vercel  # macOS/Linux
dir .vercel     # Windows

# View project configuration
cat .vercel/project.json  # macOS/Linux
type .vercel\project.json # Windows
```

### Solution 3: Re-link Project

If linking is corrupted, remove and re-link:

```bash
# Remove existing link
rm -rf .vercel  # macOS/Linux
rmdir /s .vercel  # Windows

# Link again
vercel link
```

### Solution 4: Check Vercel Authentication

Ensure you're logged in to Vercel CLI:

```bash
# Check current user
vercel whoami

# If not logged in, login
vercel login
```

---

## Slow Startup

### Problem

Vercel Dev takes 30-60 seconds (or longer) to start, which slows down your development workflow.

### Understanding the Issue

Vercel Dev is slower than Metro because it:
- Builds the full Next.js application
- Initializes serverless functions
- Sets up the production-like environment
- Connects to external services (database, Redis, Inngest)

**This is expected behavior** and ensures production parity.

### Mitigation Strategy 1: Reuse Existing Server

Keep Vercel Dev running between test runs:

**In Playwright config** (`apps/web/playwright.config.ts`):
```typescript
webServer: {
  command: 'vercel dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,  // ✅ Reuse in local dev
  timeout: 120000,
}
```

**Workflow:**
```bash
# Terminal 1: Start Vercel Dev once
cd apps/web
vercel dev

# Terminal 2: Run tests multiple times (fast)
pnpm test:e2e
pnpm test:e2e  # Reuses existing server
pnpm test:e2e  # Still fast
```

### Mitigation Strategy 2: Use Metro for UI Work

For rapid UI iteration (when you don't need API routes):

```bash
# Fast UI development
cd apps/web
pnpm dev:ui  # Uses Metro (fast hot reload)
```

**Important:** Always test with Vercel Dev before committing:

```bash
# Before committing
pnpm dev  # Uses Vercel Dev
# Test your changes manually or run E2E tests
```

### Mitigation Strategy 3: Optimize Your System

- **Close unnecessary applications** to free up resources
- **Use SSD** for faster file I/O
- **Increase RAM** (8GB minimum, 16GB recommended)
- **Disable antivirus scanning** for node_modules directory

### Mitigation Strategy 4: Increase Timeout

If Vercel Dev consistently times out, increase the timeout:

```typescript
// apps/web/playwright.config.ts
webServer: {
  timeout: 180000,  // 3 minutes instead of 2
}
```

### Expected Startup Times

- **First start**: 30-60 seconds (cold start)
- **Subsequent starts**: 10-20 seconds (warm start)
- **With reuse**: Instant (server already running)

---

## Database Connection Failures

### Problem

Your application fails to connect to the database with errors like:

```bash
Error: Unable to connect to database
Error: Connection timeout
Error: ECONNREFUSED
Error: SSL connection required
```

### Solution 1: Verify DATABASE_URL

Check that your `DATABASE_URL` is correctly formatted:

```env
# Correct format
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Common issues:
# ❌ Missing protocol: username:password@host:port/database
# ❌ Wrong protocol: mysql://... (should be postgresql://)
# ❌ Missing SSL: ...?sslmode=require
```

### Solution 2: Test Database Connectivity

Run the connectivity test script:

```bash
cd apps/web
pnpm test:db
```

Or run directly:

```bash
pnpm tsx scripts/test-database-connectivity.ts
```

This will:
- Attempt to connect to your database
- Show detailed error messages
- Verify SSL configuration
- Test a simple query
- Check table existence and structure

### Solution 3: Check Database Provider Status

Verify your database is running and accessible:

**For Neon:**
1. Go to [Neon Console](https://console.neon.tech/)
2. Check your project status
3. Verify the connection string

**For Supabase:**
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Check project status
3. Verify connection pooler settings

**For local PostgreSQL:**
```bash
# Check if PostgreSQL is running
# Windows
sc query postgresql

# macOS
brew services list | grep postgresql

# Linux
systemctl status postgresql
```

### Solution 4: Check Firewall and Network

Ensure your firewall allows database connections:

**Windows:**
1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Check if port 5432 (PostgreSQL) is open

**macOS:**
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

**Network issues:**
- Verify you're not behind a restrictive corporate firewall
- Check if VPN is interfering with connections
- Try connecting from a different network

### Solution 5: Verify SSL Configuration

Some database providers require SSL:

```env
# Add SSL mode to connection string
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# Or disable SSL for local development (not recommended for production)
DATABASE_URL=postgresql://user:pass@localhost:5432/db?sslmode=disable
```

### Solution 6: Check Connection Pooling

If you're hitting connection limits:

```typescript
// Adjust pool size in your database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Solution 7: Verify Database Credentials

Double-check your credentials:

1. **Username**: Correct database user
2. **Password**: No special characters causing issues (URL encode if needed)
3. **Host**: Correct hostname or IP
4. **Port**: Usually 5432 for PostgreSQL
5. **Database name**: Correct database name

**URL encode special characters in password:**
```javascript
// If password is: p@ssw0rd!
// Encode as: p%40ssw0rd%21
```

---

## Additional Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Dev Documentation](https://vercel.com/docs/cli/dev)
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) - Detailed setup instructions
- [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md) - Development workflow guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Environment variable reference

## Still Having Issues?

If you've tried the solutions above and still have problems:

1. **Check the logs**: Vercel Dev provides detailed error messages
2. **Search existing issues**: Check GitHub issues for similar problems
3. **Ask for help**: Reach out to your team or create a new issue
4. **Verify system requirements**: Ensure you meet minimum requirements (Node.js 18+, 8GB RAM)

## Quick Diagnostic Checklist

Run through this checklist to diagnose issues:

- [ ] Vercel CLI installed: `vercel --version`
- [ ] Logged in to Vercel: `vercel whoami`
- [ ] Project linked: `ls .vercel` or `dir .vercel`
- [ ] Environment variables set: Check `.env.local` exists
- [ ] Port 3000 available: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- [ ] Database accessible: Run `pnpm test:db` from `apps/web`
- [ ] Node.js version: `node --version` (should be 18+)
- [ ] Dependencies installed: `pnpm install`

---

**Last Updated**: November 2025
