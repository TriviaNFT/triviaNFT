# Performance Testing Guide

## Overview

This guide provides instructions for testing the performance of the TriviaNFT web application, particularly focusing on mobile devices and slow network conditions.

## Prerequisites

### Required Tools

1. **Chrome DevTools**: Built into Chrome browser
2. **Lighthouse**: Built into Chrome DevTools
3. **React DevTools**: Browser extension
4. **Network Throttling**: Built into Chrome DevTools

### Test Devices

#### Minimum Requirements
- **Desktop**: 1280x720 resolution
- **Mobile**: 375x667 resolution (iPhone SE size)

#### Recommended Test Devices
1. **iOS**: iPhone SE, iPhone 12, iPhone 14 Pro
2. **Android**: Budget device (< $200), Mid-range device, Flagship device
3. **Tablets**: iPad, Android tablet

## Performance Testing Checklist

### 1. Initial Load Performance

#### Test Steps

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Enable "Disable cache"
4. Set throttling to "Slow 3G"
5. Reload the page
6. Record metrics

#### Success Criteria

- [ ] First Contentful Paint (FCP) < 2.5s on 3G
- [ ] Time to Interactive (TTI) < 5s on 3G
- [ ] Initial bundle size < 200KB (gzipped)
- [ ] Total page weight < 1MB

### 2. Runtime Performance

#### Test Steps

1. Open Chrome DevTools Performance tab
2. Start recording
3. Navigate through the app:
   - Select category
   - Start session
   - Answer questions
   - View results
   - Check leaderboard
4. Stop recording
5. Analyze the flame chart

#### Success Criteria

- [ ] No long tasks (> 50ms)
- [ ] Smooth animations (60 FPS)
- [ ] No layout thrashing
- [ ] Memory usage stable (no leaks)

### 3. Network Performance

#### Test Network Conditions

Test on each of these network profiles:

1. **Slow 3G**
   - Download: 400 Kbps
   - Upload: 400 Kbps
   - Latency: 2000ms

2. **Fast 3G**
   - Download: 1.6 Mbps
   - Upload: 750 Kbps
   - Latency: 562ms

3. **4G**
   - Download: 4 Mbps
   - Upload: 3 Mbps
   - Latency: 170ms

#### Success Criteria

- [ ] App loads on Slow 3G within 10s
- [ ] Images load progressively
- [ ] Offline mode works (cached content)
- [ ] API requests complete within timeout

### 4. Mobile Performance

#### Test on Real Devices

1. **iOS Testing**
   ```bash
   # Connect iPhone via USB
   # Open Safari > Develop > [Your iPhone] > localhost:8081
   ```

2. **Android Testing**
   ```bash
   # Enable USB debugging
   # Open Chrome > chrome://inspect
   # Select your device
   ```

#### Success Criteria

- [ ] Touch targets ≥ 44x44px
- [ ] Smooth scrolling (no jank)
- [ ] Animations at 60 FPS
- [ ] No memory warnings
- [ ] Battery drain acceptable

### 5. Bundle Size Analysis

#### Run Bundle Analyzer

```bash
cd apps/web
npx expo export:web
# Analyze the build output
```

#### Check Bundle Sizes

```bash
# List all chunks with sizes
ls -lh dist/_expo/static/js/
```

#### Success Criteria

- [ ] Main bundle < 200KB (gzipped)
- [ ] Lazy chunks < 50KB each (gzipped)
- [ ] No duplicate dependencies
- [ ] Tree shaking working

### 6. Lighthouse Audit

#### Run Lighthouse

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select:
   - Device: Mobile
   - Categories: Performance, Accessibility, Best Practices, PWA
   - Throttling: Simulated Slow 4G
4. Click "Analyze page load"

#### Success Criteria

- [ ] Performance score ≥ 90
- [ ] Accessibility score ≥ 95
- [ ] Best Practices score ≥ 90
- [ ] PWA score ≥ 90

#### Key Metrics

- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] TBT < 200ms
- [ ] CLS < 0.1
- [ ] SI < 3.4s

### 7. Memory Profiling

#### Test for Memory Leaks

1. Open Chrome DevTools Memory tab
2. Take heap snapshot
3. Use the app for 5 minutes
4. Take another heap snapshot
5. Compare snapshots

#### Success Criteria

- [ ] No detached DOM nodes
- [ ] Event listeners cleaned up
- [ ] No growing arrays/objects
- [ ] Memory usage stable

### 8. Image Optimization

#### Check Image Loading

1. Open Network tab
2. Filter by "Img"
3. Check each image request

#### Success Criteria

- [ ] Images use appropriate sizes
- [ ] Images are compressed
- [ ] Images load lazily
- [ ] Placeholder shown while loading
- [ ] WebP format used (where supported)

### 9. Code Splitting

#### Verify Lazy Loading

1. Open Network tab
2. Navigate through app
3. Watch for chunk loading

#### Success Criteria

- [ ] Routes load separate chunks
- [ ] Heavy components lazy-loaded
- [ ] Chunks load on demand
- [ ] No unnecessary preloading

### 10. API Performance

#### Test API Response Times

1. Open Network tab
2. Filter by "XHR"
3. Perform various actions
4. Record response times

#### Success Criteria

- [ ] Session start < 500ms
- [ ] Answer submit < 300ms
- [ ] Leaderboard load < 1s
- [ ] Profile load < 500ms

## Automated Testing

### Performance Tests Script

Create a test script to run regularly:

```bash
#!/bin/bash

echo "Running performance tests..."

# Build the app
npm run build

# Run Lighthouse CI
npx lighthouse-ci autorun

# Check bundle size
npm run analyze

echo "Performance tests complete!"
```

### Continuous Integration

Add to GitHub Actions:

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npx lighthouse-ci autorun
```

## Performance Regression Testing

### Baseline Metrics

Record baseline metrics for comparison:

```json
{
  "baseline": {
    "fcp": 1.5,
    "lcp": 2.2,
    "tti": 3.0,
    "tbt": 150,
    "cls": 0.05,
    "bundleSize": 180,
    "chunkSizes": {
      "main": 180,
      "auth": 45,
      "gameplay": 48,
      "leaderboard": 42
    }
  }
}
```

### Regression Thresholds

Fail build if metrics exceed thresholds:

- FCP increase > 20%
- LCP increase > 20%
- Bundle size increase > 10%
- Any metric below passing threshold

## Real User Monitoring (RUM)

### Implement RUM

Add performance monitoring in production:

```typescript
// Track real user metrics
if (typeof window !== 'undefined' && 'performance' in window) {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    // Send to analytics
    analytics.track('page_load', {
      duration: pageLoadTime,
      fcp: perfData.responseEnd - perfData.fetchStart,
      // ... other metrics
    });
  });
}
```

## Troubleshooting

### Common Issues

#### Slow Initial Load

**Symptoms**: FCP > 3s, TTI > 5s

**Solutions**:
- Reduce bundle size
- Enable code splitting
- Optimize images
- Enable compression

#### Janky Animations

**Symptoms**: FPS < 60, stuttering

**Solutions**:
- Use CSS transforms
- Reduce repaints
- Optimize JavaScript
- Use requestAnimationFrame

#### Memory Leaks

**Symptoms**: Growing memory usage

**Solutions**:
- Clean up event listeners
- Clear timers/intervals
- Remove DOM references
- Use WeakMap for caches

#### Large Bundle Size

**Symptoms**: Bundle > 300KB

**Solutions**:
- Remove unused dependencies
- Use tree shaking
- Split code into chunks
- Lazy load components

## Performance Budget

### Set Budgets

Define performance budgets:

```json
{
  "budgets": [
    {
      "metric": "fcp",
      "budget": 1800,
      "tolerance": 200
    },
    {
      "metric": "lcp",
      "budget": 2500,
      "tolerance": 300
    },
    {
      "metric": "bundle",
      "budget": 200,
      "tolerance": 20
    }
  ]
}
```

### Monitor Budgets

Check budgets on every build:

```bash
npm run build
npm run check-budgets
```

## Reporting

### Performance Report Template

```markdown
# Performance Test Report

**Date**: 2024-01-15
**Tester**: John Doe
**Environment**: Production

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| FCP    | < 1.8s | 1.6s   | ✅     |
| LCP    | < 2.5s | 2.3s   | ✅     |
| TTI    | < 3.0s | 2.8s   | ✅     |
| Bundle | < 200KB| 185KB  | ✅     |

## Issues Found

1. Leaderboard scroll janky on low-end Android
2. Images loading slowly on 3G

## Recommendations

1. Implement virtual scrolling for leaderboard
2. Add more aggressive image compression
```

## Resources

### Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [React DevTools](https://react.dev/learn/react-developer-tools)

### Documentation

- [Web Vitals](https://web.dev/vitals/)
- [Performance Best Practices](https://web.dev/fast/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Expo Performance](https://docs.expo.dev/guides/performance/)
