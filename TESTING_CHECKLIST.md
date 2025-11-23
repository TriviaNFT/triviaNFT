# Testing Checklist for Vercel Build Fixes

Run these commands in order to verify all fixes are working correctly.

## 1. Clean Install

```bash
# Remove existing node_modules and lock file
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules
rm pnpm-lock.yaml

# Fresh install
pnpm install
```

**Expected Result:**
- Installation completes successfully
- Significantly fewer peer dependency warnings
- No critical errors

## 2. Test Cache Cleanup Script

```bash
cd apps/web
pnpm clean:cache
```

**Expected Result:**
```
🧹 Cleaning NativeWind cache directories...
Searching in: .../apps/web/node_modules
Searching in: .../node_modules
✓ Deleted: .../react-native-css-interop/.cache
✨ Cleanup complete! Deleted X cache directory(ies).
```

## 3. Build Shared Package

```bash
cd packages/shared
pnpm build
```

**Expected Result:**
- TypeScript compilation succeeds
- `dist/` directory created with compiled files
- No type errors

## 4. Build Web App

```bash
cd apps/web
pnpm build
```

**Expected Result:**
- Cache cleanup runs automatically
- Metro bundler starts
- Build completes without SHA-1 errors
- `dist/` directory created with web assets
- Exit code 0

## 5. Run Unit Tests

```bash
cd services/api
pnpm test
```

**Expected Result:**
- All unit tests pass
- No vitest peer dependency errors

## 6. Run E2E Tests (Optional - requires Vercel Dev)

```bash
cd apps/web
pnpm test:e2e
```

**Expected Result:**
- Playwright tests run successfully
- All E2E tests pass

## 7. Run Property Tests (Optional)

```bash
cd apps/web
pnpm test:properties
```

**Expected Result:**
- Property-based tests complete 100 iterations
- All properties hold true

## 8. Verify Vercel Build (Push to GitHub)

```bash
# Commit all changes
git add .
git commit -m "fix: resolve Metro SHA-1 cache error and peer dependency warnings"

# Push to test branch
git push origin test/preview-deployment
```

**Expected Result:**
- Vercel automatically triggers build
- Build completes successfully
- No SHA-1 errors in Vercel build logs
- Deployment succeeds

## 9. Check Vercel Build Logs

Go to Vercel dashboard and verify:

✅ `pnpm install` completes with minimal warnings
✅ `pnpm --filter @trivia-nft/shared build` succeeds
✅ `pnpm build` in apps/web succeeds
✅ No "SHA-1 for file ... is not computed" errors
✅ `expo export` completes successfully
✅ Deployment is live and functional

## Troubleshooting

If any step fails, refer to:
- `TROUBLESHOOTING.md` - Common issues and solutions
- `VERCEL_BUILD_FIXES.md` - Detailed explanation of fixes
- `LOCAL_DEV_GUIDE.md` - Development workflow guidance

## Quick Verification (Minimal)

If you're short on time, run these essential checks:

```bash
# 1. Install dependencies
pnpm install

# 2. Test cache cleanup
cd apps/web && pnpm clean:cache

# 3. Build web app
pnpm build

# 4. Check exit code
echo $?  # Should be 0
```

If all three succeed, the fixes are working correctly.
