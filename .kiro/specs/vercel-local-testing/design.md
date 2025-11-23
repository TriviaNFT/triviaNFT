# Design Document

## Overview

This design establishes Vercel Dev as the primary local development and testing environment for the TriviaNFT project. By standardizing on Vercel Dev, we ensure production parity, eliminate environment-specific bugs, and streamline the development workflow. The design covers configuration updates, documentation improvements, and workflow optimizations to make Vercel Dev the default choice for all developers.

## Architecture

### Current State

The project currently supports two development modes:
1. **Metro/Expo** - Fast UI development with hot reload, but no API route support
2. **Vercel Dev** - Full-stack development with production parity, but slower iteration

This dual-mode approach creates confusion and leads to environment discrepancies.

### Target State

The project will standardize on Vercel Dev as the primary development environment:
1. **Vercel Dev** - Default for all development and testing
2. **Metro/Expo** - Optional for rapid UI prototyping only (clearly documented as limited)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Vercel CLI     │
                    │   vercel dev     │
                    └──────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Next.js  │  │   API    │  │ Inngest  │
        │  Pages   │  │  Routes  │  │ Workflows│
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                    ┌──────────────────┐
                    │  External Deps   │
                    │ - Database       │
                    │ - Redis          │
                    │ - Inngest Cloud  │
                    └──────────────────┘
```

## Components and Interfaces

### 1. Vercel CLI Integration

**Purpose**: Provide the development server that mirrors production

**Interface**:
```bash
# Start development server
vercel dev [options]

# Link to Vercel project
vercel link

# Deploy to preview
vercel --prod=false
```

**Configuration**:
- Reads from `vercel.json` in project root
- Loads environment variables from `.env.local`
- Supports custom port via `--listen` flag

### 2. Playwright Configuration

**Purpose**: Configure E2E tests to use Vercel Dev

**Current Configuration** (`apps/web/playwright.config.ts`):
```typescript
webServer: {
  command: 'pnpm dev',  // Uses Metro
  url: 'http://localhost:8081',
  reuseExistingServer: !process.env.CI,
}
```

**Target Configuration**:
```typescript
webServer: {
  command: 'vercel dev',  // Uses Vercel Dev
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,  // Vercel Dev takes longer to start
}
```

### 3. Package.json Scripts

**Purpose**: Provide convenient commands for common workflows

**Target Scripts** (`apps/web/package.json`):
```json
{
  "scripts": {
    "dev": "vercel dev",
    "dev:ui": "expo start",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:unit": "cd ../../services/api && pnpm test",
    "verify": "pnpm test:unit && pnpm test:e2e"
  }
}
```

### 4. Documentation Structure

**Purpose**: Provide clear, actionable guidance for developers

**Files**:
1. `README.md` - Quick start with Vercel Dev
2. `LOCAL_DEV_GUIDE.md` - Comprehensive development guide
3. `VERCEL_SETUP.md` - Detailed Vercel CLI setup instructions
4. `TROUBLESHOOTING.md` - Common issues and solutions

## Data Models

### Environment Configuration

```typescript
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // Redis
  REDIS_URL: string;
  REDIS_TOKEN: string;
  
  // Inngest
  INNGEST_EVENT_KEY: string;
  INNGEST_SIGNING_KEY: string;
  
  // Optional: Override defaults
  PORT?: number;
  NODE_ENV?: 'development' | 'production' | 'test';
}
```

### Vercel Configuration

```typescript
interface VercelConfig {
  buildCommand?: string;
  devCommand?: string;
  installCommand?: string;
  framework?: string;
  outputDirectory?: string;
}
```

## C
orrectness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API Route Consistency

*For any* API route in the application, when called through Vercel Dev, the response should match the expected production behavior in terms of status code, response structure, and data format.

**Validates: Requirements 1.2**

### Property 2: Configuration File Consistency

*For any* configuration file (package.json, playwright.config.ts, vercel.json), the settings should reference Vercel Dev as the primary development tool, ensuring new developers automatically use the correct setup.

**Validates: Requirements 8.1, 8.2, 8.3**

## Error Handling

### Vercel CLI Not Installed

**Error**: `Command 'vercel' not found`

**Handling**:
1. Detect missing Vercel CLI during setup
2. Provide clear installation instructions
3. Offer alternative: `npx vercel dev`

**Implementation**:
```bash
# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI not found. Install with: npm i -g vercel"
  echo "Or run with: npx vercel dev"
  exit 1
fi
```

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Handling**:
1. Detect port conflict
2. Suggest killing the process or using alternative port
3. Provide platform-specific commands

**Implementation**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Alternative: Use different port
vercel dev --listen 3001
```

### Missing Environment Variables

**Error**: `Environment variable DATABASE_URL is not defined`

**Handling**:
1. Validate required environment variables on startup
2. Provide clear error messages listing missing variables
3. Reference documentation for setup

**Implementation**:
```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_TOKEN',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      `See VERCEL_SETUP.md for configuration instructions`
    );
  }
}
```

### Vercel Project Not Linked

**Error**: `No Vercel project linked`

**Handling**:
1. Detect unlinked project
2. Guide user through `vercel link` process
3. Provide troubleshooting for common linking issues

**Implementation**:
```bash
# Check if .vercel directory exists
if [ ! -d ".vercel" ]; then
  echo "Project not linked to Vercel. Run: vercel link"
  exit 1
fi
```

### Slow Startup

**Issue**: Vercel Dev takes 30-60 seconds to start

**Handling**:
1. Set appropriate timeout in Playwright config (120 seconds)
2. Document expected startup time
3. Recommend `reuseExistingServer: true` for faster iteration

**Implementation**:
```typescript
// playwright.config.ts
webServer: {
  command: 'vercel dev',
  url: 'http://localhost:3000',
  timeout: 120000,  // 2 minutes
  reuseExistingServer: !process.env.CI,
}
```

### Database Connection Failures

**Error**: `Unable to connect to database`

**Handling**:
1. Verify DATABASE_URL is set correctly
2. Check database is accessible from local machine
3. Test connection with standalone script

**Implementation**:
```typescript
// scripts/test-database-connectivity.ts
import { Pool } from 'pg';

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('Server time:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
```

## Testing Strategy

### Unit Testing

Unit tests validate individual functions and services in isolation, without requiring a running server.

**Scope**:
- Service layer functions (appconfig-service, session-service, etc.)
- Utility functions
- Data validation logic
- Business logic

**Framework**: Vitest

**Location**: `services/api/src/**/*.test.ts`

**Execution**:
```bash
cd services/api
pnpm test
```

**Example**:
```typescript
// services/api/src/services/appconfig-service.test.ts
import { describe, it, expect } from 'vitest';
import { getAppConfig } from './appconfig-service';

describe('AppConfig Service', () => {
  it('should return valid configuration', () => {
    const config = getAppConfig();
    expect(config).toBeDefined();
    expect(config.categories).toBeInstanceOf(Array);
  });
});
```

### Integration Testing

Integration tests validate that components work together correctly, including database and external service interactions.

**Scope**:
- API route handlers
- Database queries
- Redis operations
- Inngest workflow triggers

**Framework**: Vitest with test database

**Execution**:
```bash
cd services/api
pnpm test:integration
```

### End-to-End Testing

E2E tests validate complete user workflows through the browser, running against Vercel Dev.

**Scope**:
- User authentication flows
- Game session creation and management
- Question answering
- NFT minting workflows
- UI interactions

**Framework**: Playwright

**Configuration**: Tests automatically start Vercel Dev server

**Execution**:
```bash
cd apps/web
pnpm test:e2e
```

**Example**:
```typescript
// apps/web/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete game flow', async ({ page }) => {
  // Navigate to landing page
  await page.goto('/');
  
  // Start game
  await page.click('text=Start Game');
  
  // Select category
  await page.click('text=Science');
  
  // Verify questions load
  await expect(page.locator('[data-testid="question"]')).toBeVisible();
});
```

### Property-Based Testing

Property-based tests verify universal properties hold across many randomly generated inputs.

**Scope**:
- API route consistency (Property 1)
- Configuration file consistency (Property 2)

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Each property test should run a minimum of 100 iterations

**Execution**:
```bash
cd apps/web
pnpm test:properties
```

**Example for Property 1**:
```typescript
// apps/web/tests/properties/api-consistency.test.ts
import { test } from '@playwright/test';
import fc from 'fast-check';

/**
 * Feature: vercel-local-testing, Property 1: API Route Consistency
 * Validates: Requirements 1.2
 */
test('API routes return consistent responses', async ({ request }) => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('/api/health', '/api/categories', '/api/sessions'),
      async (apiRoute) => {
        const response = await request.get(`http://localhost:3000${apiRoute}`);
        
        // Property: All API routes should return valid JSON with 200 or expected status
        expect(response.status()).toBeGreaterThanOrEqual(200);
        expect(response.status()).toBeLessThan(500);
        
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/json');
        
        const body = await response.json();
        expect(body).toBeDefined();
      }
    ),
    { numRuns: 100 }
  );
});
```

**Example for Property 2**:
```typescript
// apps/web/tests/properties/config-consistency.test.ts
import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Feature: vercel-local-testing, Property 2: Configuration File Consistency
 * Validates: Requirements 8.1, 8.2, 8.3
 */
test('configuration files reference Vercel Dev', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom(
        'package.json',
        'playwright.config.ts'
      ),
      async (configFile) => {
        const filePath = path.join(process.cwd(), configFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Property: All config files should reference vercel dev
        expect(content).toContain('vercel dev');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testing Workflow

1. **During Development**:
   ```bash
   # Terminal 1: Start Vercel Dev
   cd apps/web
   vercel dev
   
   # Terminal 2: Run tests as needed
   pnpm test:unit      # Fast feedback
   pnpm test:e2e       # Full validation
   ```

2. **Before Committing**:
   ```bash
   # Run all tests
   cd apps/web
   pnpm verify  # Runs unit + E2E tests
   ```

3. **In CI/CD**:
   ```bash
   # CI automatically runs all tests
   pnpm test:unit
   pnpm test:e2e  # Starts fresh Vercel Dev instance
   pnpm test:properties
   ```

## Implementation Notes

### Playwright Configuration Details

The Playwright configuration must be updated to:
1. Use `vercel dev` instead of `pnpm dev`
2. Point to `http://localhost:3000` instead of `http://localhost:8081`
3. Increase timeout to 120 seconds for slower Vercel Dev startup
4. Enable server reuse in local development

### Package.json Script Updates

The `dev` script should be changed from Metro to Vercel Dev, with Metro available as `dev:ui` for optional UI-only work.

### Documentation Structure

Documentation should follow this hierarchy:
1. **README.md** - Quick start (5 minutes to running)
2. **VERCEL_SETUP.md** - Detailed setup (first-time configuration)
3. **LOCAL_DEV_GUIDE.md** - Daily workflow and best practices
4. **TROUBLESHOOTING.md** - Common issues and solutions

### Environment Variable Management

All environment variables should be:
1. Documented in `ENVIRONMENT_VARIABLES.md`
2. Provided as examples in `.env.local.example`
3. Loaded automatically by Vercel Dev from `.env.local`
4. Validated on application startup

### Migration Path

For existing developers:
1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Update scripts: `git pull` (gets new package.json)
4. Run new dev command: `pnpm dev` (now uses Vercel Dev)

## Performance Considerations

### Startup Time

- **Metro**: ~5-10 seconds
- **Vercel Dev**: ~30-60 seconds (first time), ~10-20 seconds (subsequent)

**Mitigation**: Use `reuseExistingServer: true` in Playwright config for local development

### Hot Reload

- **Metro**: Instant hot reload
- **Vercel Dev**: Slower, requires browser refresh

**Mitigation**: For rapid UI iteration, developers can optionally use `pnpm dev:ui` (Metro), but must test with Vercel Dev before committing

### Resource Usage

Vercel Dev uses more memory and CPU than Metro due to running the full Next.js stack.

**Mitigation**: Document minimum system requirements (8GB RAM recommended)

## Security Considerations

### Environment Variables

- `.env.local` files must be in `.gitignore`
- Never commit sensitive credentials
- Use `.env.local.example` for documentation

### Vercel CLI Authentication

- Vercel CLI stores authentication tokens locally
- Tokens should be kept secure
- Use `vercel logout` on shared machines

## Deployment Considerations

### Production Parity

By using Vercel Dev locally, we ensure:
- Same runtime environment
- Same API route behavior
- Same environment variable handling
- Same build process

### Preview Deployments

Vercel preview deployments can be used for:
- Testing before production
- Sharing work with team
- Running E2E tests in cloud environment

```bash
# Deploy to preview
vercel --prod=false

# Run E2E tests against preview
PLAYWRIGHT_BASE_URL=<preview-url> pnpm test:e2e
```
