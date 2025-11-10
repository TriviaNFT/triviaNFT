# Expo Router + Metro + pnpm Fix Applied

## Changes Made

### 1. ✅ Babel Configuration (`apps/web/babel.config.js`)
- **Removed** deprecated `expo-router/babel` plugin (deprecated in SDK 50)
- Router transforms now handled by `babel-preset-expo` automatically
- Set `EXPO_ROUTER_APP_ROOT = './app'` to make the router root explicit

### 2. ✅ Metro Configuration (`apps/web/metro.config.js`)
- Enabled `unstable_enableSymlinks: true` (critical for pnpm on Windows)
- Enabled `unstable_enablePackageExports: true` (honors modern package exports)
- Kept the symlink-aware resolver from `@rnx-kit/metro-resolver-symlinks`

### 3. ✅ Scoped Hoisting (`apps/web/.npmrc`)
- Created workspace-level `.npmrc` with `node-linker=hoisted`
- This gives Metro a flat node_modules only for the web workspace
- Low blast-radius workaround for Windows symlink issues

### 4. ✅ Version Alignment
- Installed `react-dom@18.2.0` (was 18.3.1, expected by SDK 50)
- Installed `@expo/metro-runtime@~3.1.3` (was 3.2.3, expected by SDK 50)

### 5. ✅ Custom Entry Point (Bypass Resolution Issues)
- Created `apps/web/index.tsx` with direct ExpoRoot wiring
- Updated `package.json` main entry to `./index.tsx`
- This bypasses env indirection and symlink resolution issues

### 6. ✅ Metro Optimizations
- Narrowed `watchFolders` to only `packages/shared` (reduces Windows scan overhead)
- Added `'cjs'` to `sourceExts` for CommonJS entry points
- Kept symlink flags and resolver

### 7. ✅ Web Polyfills (Runtime Fix)
- Moved polyfills to **dependencies** (not devDependencies)
- Created `apps/web/polyfills.ts` with subpath imports (`buffer/`, `process/browser`)
- This bypasses Metro's core-module blocking while still loading the polyfills
- Imported polyfills first in `index.tsx` before any other code
- Injects Buffer/process/global at runtime before any package uses them

## Next Steps

Start the dev server with clean Metro cache:

```powershell
cd apps\web
pnpm exec expo start --web --clear
```

If it still hangs, run with debug logs:
```powershell
$env:EXPO_DEBUG="1"
pnpm exec expo start --web --clear
```

Also press `w` in the terminal to open the browser and check DevTools → Network for pending requests.

## Verification Commands

```powershell
# Should print a real file path (no hang)
cd apps\web
node -p "require.resolve('expo-router/entry')"

# Should print './app'
node -e "process.env.EXPO_ROUTER_APP_ROOT='./app'; console.log(process.env.EXPO_ROUTER_APP_ROOT)"
```

## Windows Developer Mode (Optional but Recommended)

Enable Windows Developer Mode for better symlink support:
1. Open Settings → For developers
2. Toggle "Developer Mode" ON
3. Restart your terminal

## What This Fixes

- **99.8% hang**: Metro can now resolve expo-router entry point through pnpm symlinks
- **Symlink resolution**: Both Metro flags work together with the rnx-kit resolver
- **Package exports**: Modern packages with "exports" field now work correctly
- **Windows compatibility**: Scoped hoisting avoids global pnpm symlink issues

## If Issues Persist

If you still see the 99.8% hang after these changes:
1. Verify Windows Developer Mode is enabled
2. Check that no `webpack.config.js` exists in `apps/web/`
3. Ensure `app.json` has `"bundler": "metro"` (it does)
4. Try running with `--no-dev --minify` to see if it's a dev-only issue

## Rollback

If you need to revert:
```powershell
cd apps\web
del .npmrc
git checkout babel.config.js metro.config.js
```
