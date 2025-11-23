# NativeWind v5 Migration Plan

## Executive Summary

**Current Status**: NativeWind v4.0.1 with workaround (skipping Metro wrapper for web builds)

**Recommendation**: **Wait for stable release** - NativeWind v5 is currently in pre-release and **not intended for production use**.

**Timeline**: Monitor for stable release (likely Q1-Q2 2025 based on community discussions)

---

## Current Situation

### What We Have Now (v4.0.1)
- ✅ Builds successfully on Vercel
- ✅ Native apps work perfectly
- ⚠️ Web builds skip `withNativeWind` wrapper to avoid SHA-1 cache errors
- ⚠️ Some NativeWind classes need manual conversion to inline styles

### The Workaround Impact
```tsx
// Before (broken on web)
<View className="flex-1 justify-center items-center" />

// After (works everywhere)
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
```

---

## NativeWind v5 Overview

### Key Features
1. **Tailwind CSS v4 Integration** - Uses new Tailwind v4 architecture
2. **Better Monorepo Support** - Improved handling of pnpm/yarn workspaces
3. **React Native 0.81+ Required** - Leverages new RN architecture improvements
4. **Reanimated v4+ Required** - Better animation support
5. **No Metro Wrapper Needed** - Uses PostCSS directly (might solve our issue!)

### Breaking Changes
- Requires React Native 0.81+ (you're on 0.73.6)
- Requires Reanimated v4+ (you're on 4.1.5 ✅)
- Babel config changes
- Metro config changes
- Tailwind config changes (v4 syntax)

### Current Status
⚠️ **Pre-release / Beta** - Not recommended for production

---

## Migration Options

### Option 1: Wait for NativeWind v5 Stable (RECOMMENDED)

**Timeline**: Q1-Q2 2025 (estimated)

**Pros**:
- ✅ Production-ready when released
- ✅ Better monorepo support might eliminate workarounds
- ✅ Community-tested and documented
- ✅ Stable API

**Cons**:
- ⏳ Need to maintain current workaround
- ⏳ Uncertain release date

**Action Items**:
1. Monitor NativeWind GitHub releases
2. Continue using current workaround
3. Document components that need inline styles
4. Plan upgrade when stable

---

### Option 2: Migrate to NativeWind v5 Beta Now

**Timeline**: 1-2 weeks of work

**Pros**:
- ✅ Might solve SHA-1 cache issue immediately
- ✅ Get ahead of breaking changes
- ✅ Access to new features

**Cons**:
- ❌ Not production-ready (official warning)
- ❌ Requires React Native upgrade (0.73 → 0.81+)
- ❌ Potential bugs and API changes
- ❌ Limited documentation
- ❌ Breaking changes in future releases

**Action Items**:
1. Upgrade React Native 0.73.6 → 0.81+ (major undertaking)
2. Upgrade Expo SDK 50 → 54+ (when available)
3. Migrate Tailwind v3 → v4 config
4. Update all Babel/Metro configs
5. Test extensively across platforms
6. Monitor for breaking changes

**Risk Level**: 🔴 HIGH - Not recommended for production app

---

### Option 3: Separate CSS Solutions (ALTERNATIVE)

Use different styling approaches for web vs native:

**Web**: Plain Tailwind CSS v4 (via PostCSS)
**Native**: NativeWind v4 (current)

**Pros**:
- ✅ Best tool for each platform
- ✅ No workarounds needed
- ✅ Production-ready
- ✅ Better performance

**Cons**:
- ⚠️ More configuration
- ⚠️ Need to maintain two styling approaches
- ⚠️ Shared components need platform-specific styles

**Action Items**:
1. Set up Tailwind CSS for web separately
2. Keep NativeWind for native
3. Create platform-specific style utilities
4. Update shared components

**Risk Level**: 🟡 MEDIUM - More work but stable

---

### Option 4: Keep Current Workaround (PRAGMATIC)

Continue with current solution: skip `withNativeWind` for web, convert classes to inline styles as needed.

**Pros**:
- ✅ Already working
- ✅ Minimal effort
- ✅ Production-ready
- ✅ Can upgrade later

**Cons**:
- ⚠️ Manual style conversions needed
- ⚠️ More verbose code
- ⚠️ Need to track affected components

**Action Items**:
1. Document pattern for style conversions
2. Create utility functions for common patterns
3. Monitor NativeWind v5 progress
4. Plan migration when stable

**Risk Level**: 🟢 LOW - Safe and working

---

## Recommended Approach

### Phase 1: Now (Current Sprint)
1. ✅ Commit the WalletConnect modal fix
2. ✅ Document the workaround pattern
3. ✅ Create utility functions for common style patterns
4. ✅ Audit components for NativeWind class usage

### Phase 2: Next 1-2 Months
1. Monitor NativeWind v5 release status
2. Convert critical components to inline styles proactively
3. Create style utility library for common patterns
4. Test app thoroughly with current setup

### Phase 3: When NativeWind v5 Stable
1. Review migration guide
2. Test in development branch
3. Evaluate if upgrade solves SHA-1 issue
4. Plan React Native upgrade if needed
5. Migrate incrementally

---

## Decision Matrix

| Criteria | Option 1: Wait | Option 2: Beta Now | Option 3: Separate | Option 4: Current |
|----------|----------------|--------------------|--------------------|-------------------|
| **Production Ready** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Effort Required** | 🟢 Low | 🔴 High | 🟡 Medium | 🟢 Low |
| **Risk Level** | 🟢 Low | 🔴 High | 🟡 Medium | 🟢 Low |
| **Solves SHA-1** | ❓ Maybe | ❓ Maybe | ✅ Yes | ✅ Yes |
| **Time to Deploy** | ⏱️ Now | ⏱️ 2+ weeks | ⏱️ 1 week | ⏱️ Now |
| **Maintenance** | 🟢 Low | 🔴 High | 🟡 Medium | 🟢 Low |

---

## Immediate Action Plan

### This Week
1. **Commit current fixes**
   ```bash
   git add apps/web/src/components/WalletConnect.tsx
   git commit -m "fix: use inline styles for modal positioning"
   git push origin test/preview-deployment
   ```

2. **Create style utility helpers**
   ```tsx
   // apps/web/src/utils/styles.ts
   export const modalOverlay = {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.8)',
     justifyContent: 'center',
     alignItems: 'center',
   };
   
   export const centerContent = {
     justifyContent: 'center',
     alignItems: 'center',
   };
   ```

3. **Audit components**
   - Search for `className=` usage
   - Identify critical components
   - Convert as needed

### Next Month
1. **Monitor NativeWind v5**
   - Watch GitHub releases: https://github.com/nativewind/nativewind
   - Check documentation updates
   - Review community feedback

2. **Improve current setup**
   - Create comprehensive style utilities
   - Document patterns
   - Optimize build process

### When v5 Stable
1. **Evaluate upgrade**
   - Review breaking changes
   - Test in dev branch
   - Measure effort vs benefit
   - Make informed decision

---

## Resources

- **NativeWind v5 Docs**: https://www.nativewind.dev/v5
- **Migration Guide**: https://www.nativewind.dev/v5/guides/migrate-from-v4
- **GitHub Issues**: https://github.com/nativewind/nativewind/issues
- **Tailwind v4 Upgrade**: https://tailwindcss.com/docs/upgrade-guide

---

## Conclusion

**Recommendation**: **Option 4 (Keep Current Workaround)** with monitoring for v5 stable release.

**Rationale**:
- Your app is deployed and working
- NativeWind v5 is not production-ready
- Current workaround is low-risk and maintainable
- Can upgrade when v5 is stable with minimal disruption

**Next Steps**:
1. Commit the modal fix
2. Create style utility functions
3. Monitor v5 progress
4. Revisit in Q1 2025
