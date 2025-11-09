# Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented in the TriviaNFT web application to ensure fast loading and smooth operation, especially on mobile devices and slow networks.

## Code Splitting

### React.lazy Implementation

All major routes and components are lazy-loaded to reduce initial bundle size:

```typescript
import { lazy } from 'react';
import { LazyLoad } from '../components/LazyLoad';

const CategorySelection = lazy(() => import('../components/CategorySelection'));

// Usage
<LazyLoad>
  <CategorySelection />
</LazyLoad>
```

### Route-Based Splitting

Routes are split into separate chunks:
- Auth routes
- Gameplay routes
- Leaderboard routes
- Profile routes
- NFT/Minting routes
- Forge routes

### Component-Based Splitting

Heavy components are lazy-loaded:
- NFT galleries
- Leaderboard tables
- Profile statistics
- Forge interfaces

## Image Optimization

### OptimizedImage Component

Use the `OptimizedImage` component for all images:

```typescript
<OptimizedImage
  source={{ uri: imageUrl }}
  width={300}
  height={200}
  placeholder={<Skeleton />}
  fallback={<ErrorImage />}
/>
```

### Responsive Image Sizing

Images are served at appropriate sizes based on screen width:
- Mobile (< 375px): 375px width
- Large Mobile (< 768px): 768px width
- Tablet (< 1024px): 1024px width
- Desktop (< 1280px): 1280px width
- Large Desktop: 1920px width

### Image Loading Strategy

1. **Lazy Loading**: Images load only when visible
2. **Progressive Loading**: Show placeholder while loading
3. **Error Handling**: Display fallback on load failure
4. **Caching**: Browser caches optimized images

## Bundle Size Optimization

### Current Bundle Targets

- **Initial Bundle**: < 200KB (gzipped)
- **Total Bundle**: < 1MB (gzipped)
- **Lazy Chunks**: < 50KB each (gzipped)

### Optimization Techniques

1. **Tree Shaking**: Remove unused code
2. **Minification**: Compress JavaScript and CSS
3. **Code Splitting**: Split into smaller chunks
4. **Dynamic Imports**: Load code on demand

### Dependencies Optimization

#### Avoid Large Dependencies

Replace heavy libraries with lighter alternatives:
- ❌ Moment.js (large) → ✅ date-fns (modular)
- ❌ Lodash (full) → ✅ Lodash (individual functions)
- ❌ Full icon libraries → ✅ Individual icons

#### Bundle Analysis

Run bundle analysis to identify large dependencies:

```bash
# Analyze bundle size
npx expo export:web --analyze
```

## Network Optimization

### API Request Optimization

1. **Request Batching**: Combine multiple requests
2. **Caching**: Cache API responses
3. **Compression**: Enable gzip/brotli
4. **CDN**: Serve static assets from CDN

### Network Detection

Adapt behavior based on network speed:

```typescript
import { isSlowNetwork, getNetworkInfo } from '../utils/performance';

if (isSlowNetwork()) {
  // Reduce image quality
  // Disable animations
  // Limit concurrent requests
}
```

### Offline Support

Service worker caches critical assets:
- App shell
- Core JavaScript
- Essential CSS
- Fallback images

## Rendering Performance

### React Performance

1. **Memoization**: Use `React.memo` for expensive components
2. **useMemo**: Memoize expensive calculations
3. **useCallback**: Prevent unnecessary re-renders
4. **Virtual Lists**: Use for long lists (leaderboards)

### Example: Memoized Component

```typescript
import React, { memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id;
});
```

### Animation Performance

1. **CSS Transforms**: Use transform instead of position
2. **GPU Acceleration**: Use `transform: translateZ(0)`
3. **RequestAnimationFrame**: For JavaScript animations
4. **Reduce Repaints**: Minimize layout thrashing

## Performance Monitoring

### Built-in Monitoring

Use the performance monitor utility:

```typescript
import { performanceMonitor, measureAsync } from '../utils/performance';

// Mark start
performanceMonitor.mark('session-load');

// Do work
await loadSession();

// Measure duration
const duration = performanceMonitor.measure('session-load');
console.log(`Session loaded in ${duration}ms`);
```

### Key Metrics to Track

1. **Time to Interactive (TTI)**: < 3s on 3G
2. **First Contentful Paint (FCP)**: < 1.5s
3. **Largest Contentful Paint (LCP)**: < 2.5s
4. **Cumulative Layout Shift (CLS)**: < 0.1
5. **First Input Delay (FID)**: < 100ms

### Performance Budget

Set performance budgets for key metrics:

```json
{
  "budgets": [
    {
      "resourceType": "script",
      "budget": 200
    },
    {
      "resourceType": "style",
      "budget": 50
    },
    {
      "resourceType": "image",
      "budget": 500
    }
  ]
}
```

## Mobile-Specific Optimizations

### Touch Event Optimization

1. **Passive Listeners**: Use passive event listeners
2. **Debouncing**: Debounce rapid touch events
3. **Throttling**: Throttle scroll events

```typescript
import { debounce, throttle } from '../utils/performance';

const handleScroll = throttle(() => {
  // Handle scroll
}, 100);

const handleSearch = debounce((query) => {
  // Handle search
}, 300);
```

### Memory Management

1. **Cleanup**: Remove event listeners on unmount
2. **Weak References**: Use WeakMap for caches
3. **Limit Cache Size**: Cap cache entries
4. **Clear Unused Data**: Remove old session data

### Battery Optimization

1. **Reduce Polling**: Increase poll intervals
2. **Pause Background Tasks**: When app is inactive
3. **Optimize Animations**: Reduce on low battery

## Testing Performance

### Manual Testing

Test on real devices:
1. **Low-end Android**: Test on budget devices
2. **Older iPhones**: Test on iPhone 8 or older
3. **Slow Networks**: Test on 3G/slow 4G

### Automated Testing

Use Lighthouse for automated testing:

```bash
# Run Lighthouse
npx lighthouse http://localhost:8081 --view
```

### Performance Checklist

- [ ] Initial bundle < 200KB gzipped
- [ ] TTI < 3s on 3G
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] All images optimized
- [ ] Code splitting implemented
- [ ] Service worker caching enabled
- [ ] API responses cached
- [ ] Animations use transforms
- [ ] Long lists virtualized

## Continuous Optimization

### Regular Audits

1. **Weekly**: Check bundle size
2. **Monthly**: Run Lighthouse audits
3. **Quarterly**: Review dependencies
4. **Annually**: Major performance review

### Monitoring in Production

1. **Real User Monitoring (RUM)**: Track actual user performance
2. **Error Tracking**: Monitor performance errors
3. **Analytics**: Track slow operations
4. **Alerts**: Set up performance alerts

## Best Practices

### DO

✅ Lazy load non-critical components
✅ Optimize images for screen size
✅ Use code splitting for routes
✅ Cache API responses
✅ Minimize bundle size
✅ Test on real devices
✅ Monitor performance metrics
✅ Use memoization for expensive operations

### DON'T

❌ Load all components upfront
❌ Serve full-size images to mobile
❌ Bundle everything in one file
❌ Make redundant API calls
❌ Include unused dependencies
❌ Test only on high-end devices
❌ Ignore performance metrics
❌ Re-render unnecessarily

## Resources

### Tools

- **Lighthouse**: Performance auditing
- **Chrome DevTools**: Performance profiling
- **React DevTools**: Component profiling
- **Bundle Analyzer**: Bundle size analysis

### Documentation

- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Expo Performance](https://docs.expo.dev/guides/performance/)
- [PWA Performance](https://web.dev/pwa/)
