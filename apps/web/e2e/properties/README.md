# Property-Based Tests

This directory contains property-based tests for the TriviaNFT application using fast-check and Playwright.

## What are Property-Based Tests?

Property-based tests verify that certain properties (invariants) hold true across a wide range of randomly generated inputs. Instead of testing specific examples, they test general rules that should always be true.

## Prerequisites

Before running these tests, ensure you have:

1. **Vercel CLI installed**:
   ```bash
   npm i -g vercel
   ```

2. **Project linked to Vercel**:
   ```bash
   cd apps/web
   vercel link
   ```

3. **Environment variables configured**:
   - Copy `.env.local.example` to `.env.local`
   - Fill in all required environment variables
   - See `VERCEL_SETUP.md` for details

## Running Property Tests

### Run all property tests:
```bash
cd apps/web
pnpm test:e2e e2e/properties/
```

### Run a specific property test:
```bash
cd apps/web
pnpm test:e2e e2e/properties/api-consistency.spec.ts
```

### Run with UI mode (for debugging):
```bash
cd apps/web
pnpm test:e2e:ui e2e/properties/api-consistency.spec.ts
```

## Test Files

### api-consistency.spec.ts

**Feature**: vercel-local-testing, Property 1: API Route Consistency  
**Validates**: Requirements 1.2

Tests that API routes return consistent responses when called through Vercel Dev:
- Valid status codes (2xx or expected error codes)
- JSON content type
- Valid JSON body structure
- Idempotent GET requests
- Graceful handling of invalid HTTP methods

**Iterations**: 100 runs per property (configurable via `numRuns`)

## How Property Tests Work

Each property test:
1. Generates random inputs using fast-check
2. Executes the test with those inputs
3. Verifies the property holds true
4. Repeats for the specified number of iterations (default: 100)
5. Reports any counterexamples that violate the property

## Troubleshooting

### "Command 'vercel' not found"
Install Vercel CLI: `npm i -g vercel`

### "Project not linked"
Run `vercel link` in the `apps/web` directory

### "Environment variables not found"
Ensure `.env.local` exists and contains all required variables

### Tests timeout
Increase the timeout in `playwright.config.ts` or ensure your system meets the minimum requirements (8GB RAM recommended)

## Adding New Property Tests

When adding new property tests:

1. Create a new `.spec.ts` file in this directory
2. Import fast-check: `import fc from 'fast-check'`
3. Use `fc.assert()` with `fc.asyncProperty()` for async tests
4. Configure `numRuns` to at least 100 iterations
5. Tag the test with the feature name and property number
6. Document which requirements the property validates

Example:
```typescript
test('Property X: Description', async ({ request }) => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom(...inputs),
      async (input) => {
        // Test logic here
        expect(result).toSatisfyProperty();
      }
    ),
    { numRuns: 100 }
  );
});
```

## References

- [fast-check documentation](https://fast-check.dev/)
- [Playwright documentation](https://playwright.dev/)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/posts/property-based-testing/)
