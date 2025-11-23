# Vercel Setup Guide

This guide walks you through setting up Vercel Dev for local development. Vercel Dev provides a production-like environment locally, ensuring your code works the same way in development as it does in production.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- A Vercel account (free tier works fine)
- Git repository cloned locally

## Quick Start

If you're already familiar with Vercel CLI, here's the quick version:

```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to the web app
cd apps/web

# Link your project to Vercel
vercel link

# Start development server
vercel dev
```

## Detailed Setup Instructions

### Step 1: Install Vercel CLI

Choose the installation method for your platform:

#### Windows

**Option 1: Using npm (Recommended)**
```powershell
npm i -g vercel
```

**Option 2: Using pnpm**
```powershell
pnpm add -g vercel
```

**Verify Installation:**
```powershell
vercel --version
```

#### macOS

**Option 1: Using npm (Recommended)**
```bash
npm i -g vercel
```

**Option 2: Using Homebrew**
```bash
brew install vercel-cli
```

**Option 3: Using pnpm**
```bash
pnpm add -g vercel
```

**Verify Installation:**
```bash
vercel --version
```

#### Linux

**Option 1: Using npm (Recommended)**
```bash
npm i -g vercel
```

**Option 2: Using pnpm**
```bash
pnpm add -g vercel
```

**Verify Installation:**
```bash
vercel --version
```

### Step 2: Authenticate with Vercel

Run the login command to authenticate:

```bash
vercel login
```

You'll see a prompt like this:

```
Vercel CLI 33.0.0
? Log in to Vercel (Use arrow keys)
❯ Continue with GitHub
  Continue with GitLab
  Continue with Bitbucket
  Continue with Email
  Continue with SAML Single Sign-On
```

**Choose your preferred authentication method** (GitHub is recommended if your repository is on GitHub).

After selecting, your browser will open. Authorize the Vercel CLI and you'll see:

```
✔ Success! Authentication complete.
```

### Step 3: Link Your Project

Navigate to the web application directory:

```bash
cd apps/web
```

Run the link command:

```bash
vercel link
```

You'll be prompted with several questions. Here's what to expect:

#### Prompt 1: Set up and deploy

```
? Set up and deploy "~/path/to/project/apps/web"? (Y/n)
```

**Answer:** `Y` (Yes)

#### Prompt 2: Which scope

```
? Which scope do you want to deploy to?
```

**Answer:** Select your Vercel account or team

#### Prompt 3: Link to existing project

```
? Link to existing project? (y/N)
```

**Answer:** 
- `Y` if the project already exists on Vercel
- `N` if this is a new project

#### Prompt 4a: If linking to existing project

```
? What's the name of your existing project?
```

**Answer:** Type the exact project name from your Vercel dashboard

#### Prompt 4b: If creating new project

```
? What's your project's name?
```

**Answer:** Enter a name (e.g., `trivianft` or `trivianft-dev`)

#### Prompt 5: In which directory is your code located

```
? In which directory is your code located? ./
```

**Answer:** Press Enter to accept `./` (current directory)

#### Success Message

```
✔ Linked to username/project-name (created .vercel directory)
```

The `.vercel` directory contains your project configuration. **This directory is gitignored** and should not be committed.

### Step 4: Configure Environment Variables

Create a `.env.local` file in the `apps/web` directory:

```bash
# From apps/web directory
touch .env.local
```

Add the required environment variables. See `.env.local.example` for a template:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=https://your-redis-instance.upstash.io
REDIS_TOKEN=your-redis-token

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Optional: Override defaults
PORT=3000
NODE_ENV=development
```

**Important:** 
- Never commit `.env.local` to version control
- Get credentials from your team lead or project documentation
- See `ENVIRONMENT_VARIABLES.md` for detailed variable descriptions

### Step 5: Start Vercel Dev

From the `apps/web` directory, run:

```bash
vercel dev
```

You'll see output like this:

```
Vercel CLI 33.0.0
> Ready! Available at http://localhost:3000
```

**First-time startup** may take 30-60 seconds as Vercel builds your project.

**Subsequent startups** are faster (10-20 seconds).

### Step 6: Verify Setup

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the TriviaNFT landing page.

Test an API route:

```
http://localhost:3000/api/health
```

You should see a JSON response indicating the API is working.

## Troubleshooting

### Command not found: vercel

**Problem:** After installing, the `vercel` command is not recognized.

**Solutions:**

1. **Restart your terminal** - The PATH may not be updated in your current session

2. **Check npm global bin directory:**
   ```bash
   npm config get prefix
   ```
   
   Ensure this directory is in your PATH environment variable.

3. **Use npx as alternative:**
   ```bash
   npx vercel dev
   ```

4. **Reinstall with different method:**
   - Windows: Try using npm instead of pnpm, or vice versa
   - macOS: Try Homebrew if npm didn't work
   - Linux: Ensure you have proper permissions for global installs

### Port 3000 already in use

**Problem:** You see an error like `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**

1. **Find and kill the process using port 3000:**

   **Windows:**
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

   **macOS/Linux:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use a different port:**
   ```bash
   vercel dev --listen 3001
   ```

### Environment variables not found

**Problem:** Application starts but fails with errors about missing environment variables.

**Solutions:**

1. **Verify `.env.local` exists:**
   ```bash
   ls -la apps/web/.env.local
   ```

2. **Check variable names match exactly** - Environment variables are case-sensitive

3. **Restart Vercel Dev** after adding new variables

4. **Run the validation script:**
   ```bash
   pnpm run verify:env
   ```

5. **Check for typos** in variable names (e.g., `DATABASE_URL` not `DB_URL`)

### Vercel project not linked

**Problem:** Running `vercel dev` shows `Error: No Vercel project linked`

**Solutions:**

1. **Run the link command:**
   ```bash
   cd apps/web
   vercel link
   ```

2. **Check if `.vercel` directory exists:**
   ```bash
   ls -la .vercel
   ```

3. **If `.vercel` exists but still not working, remove and re-link:**
   ```bash
   rm -rf .vercel
   vercel link
   ```

### Slow startup time

**Problem:** Vercel Dev takes a long time to start (30-60 seconds or more).

**Explanation:** This is normal behavior for Vercel Dev, especially on first startup. Vercel is:
- Building your Next.js application
- Initializing serverless functions
- Setting up the development environment

**Mitigation:**

1. **Keep Vercel Dev running** - Don't restart it frequently. Use `reuseExistingServer` in Playwright config.

2. **Use Metro for rapid UI iteration** - If you're only working on UI components:
   ```bash
   pnpm dev:ui
   ```
   
   But remember to test with Vercel Dev before committing!

3. **Upgrade your hardware** - Vercel Dev benefits from:
   - 8GB+ RAM (16GB recommended)
   - SSD storage
   - Modern CPU

### Database connection failures

**Problem:** Application starts but can't connect to the database.

**Solutions:**

1. **Verify DATABASE_URL is correct:**
   ```bash
   echo $DATABASE_URL  # macOS/Linux
   echo %DATABASE_URL%  # Windows CMD
   $env:DATABASE_URL   # Windows PowerShell
   ```

2. **Test database connectivity:**
   ```bash
   pnpm run test:db
   ```

3. **Check database is accessible** from your network:
   - Verify firewall rules
   - Check VPN connection if required
   - Confirm database is running

4. **Verify connection string format:**
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

### Authentication errors with Vercel

**Problem:** `vercel login` fails or shows authentication errors.

**Solutions:**

1. **Clear Vercel credentials and re-authenticate:**
   ```bash
   vercel logout
   vercel login
   ```

2. **Check browser pop-up blockers** - The authentication flow opens a browser window

3. **Try a different authentication method** - If GitHub fails, try email

4. **Check Vercel status** - Visit https://www.vercel-status.com/

### Build errors on startup

**Problem:** Vercel Dev fails to start with build errors.

**Solutions:**

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Clear build cache:**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   ```

3. **Check for TypeScript errors:**
   ```bash
   pnpm run type-check
   ```

4. **Review error messages** - They usually indicate the specific issue

## Next Steps

Once Vercel Dev is running successfully:

1. **Read the development guide:** See `LOCAL_DEV_GUIDE.md` for daily workflow
2. **Run tests:** Try `pnpm test:e2e` to verify E2E tests work
3. **Explore the API:** Visit http://localhost:3000/api/inngest to see Inngest integration

## Getting Help

If you're still having issues:

1. Check `TROUBLESHOOTING.md` for more detailed solutions
2. Review `LOCAL_DEV_GUIDE.md` for workflow guidance
3. Ask your team lead or post in the team chat
4. Check Vercel documentation: https://vercel.com/docs/cli

## Additional Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Dev Command Reference](https://vercel.com/docs/cli/dev)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Documentation](https://nextjs.org/docs)
