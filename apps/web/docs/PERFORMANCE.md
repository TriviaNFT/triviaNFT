# Landing Page Performance Optimization

This document outlines the performance optimizations implemented for the TriviaNFT landing page.

## Performance Targets

Based on Requirement 1.1, the landing page must meet these targets:

- **Time to Interactive (TTI)**: < 2000ms
- **First Contentful Paint (FCP)**: < 1000ms
- **Largest Contentful Paint (LCP)**: < 2500ms
- **Cumulative Layout Shift (CLS)**: < 0.1

## Optimizations Implemented

### 1. SVG Asset Optimization

All SVG icons have been optimized to reduce file size and improve rendering performance:

- **Removed comments**: All XML comments removed from SVG files
- **Minimized whitespace**: Unnecessary spaces and line breaks removed
- **Removed redundant attributes**: `fill="none"` removed where not needed
- **Compact path data**: Removed unnecessary spaces in path commands

**Impact**: ~30-40% reduction in SVG file sizes

### 2. Lazy Loading

Below-the-fold content is lazy loaded to improve initial page load:

```typescript
// ComponentDemos is lazy loaded
const ComponentDemos = React.lazy(() => 
  import('../src/components/landing/ComponentDemos').then(module => ({ 
    default: module.ComponentDemos 
  }))
);
```

**Impact**: Reduces initial JavaScript bundle size and improves TTI

### 3. Animation Performance (60fps)

CSS optimizations ensure animations run smoothly at 60fps:

```css
.animate-float,
.animate-float-delayed,
.animate-glow-pulse {
  /* GPU acceleration */
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

**Key techniques**:
- Use `transform` and `opacity` (GPU-accelerated properties)
- Avoid animating layout properties (`width`, `height`, `margin`)
- Use `will-change` to hint browser about upcoming animations
- Force hardware acceleration with `translateZ(0)`

### 4. Reduced Motion Support

Respects user's motion preferences for accessibility:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Impact**: Improves accessibility and performance for users who prefer reduced motion

### 5. Network Optimization

- **Minimal requests**: Optimized to reduce number of network requests
- **No duplicate requests**: Ensured assets are not loaded multiple times
- **Efficient bundling**: Metro bundler optimizes JavaScript delivery

## Performance Measurement

### Automated Testing

Run performance tests with Playwright:

```bash
pnpm --filter @trivia-nft/web test:e2e apps/web/e2e/landing-page-performance.spec.ts
```

### Manual Measurement Script

Use the performance measurement script:

```bash
# Start dev server first
pnpm --filter @trivia-nft/web dev

# In another terminal, run measurement
node apps/web/scripts/measure-performance.js
```

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Run audit for **Performance**
4. Check metrics:
   - First Contentful Paint
   - Time to Interactive
   - Speed Index
   - Total Blocking Time
   - Largest Contentful Paint
   - Cumulative Layout Shift

## Performance Monitoring

### Key Metrics to Track

1. **First Contentful Paint (FCP)**
   - Target: < 1000ms
   - Measures when first content appears

2. **Time to Interactive (TTI)**
   - Target: < 2000ms
   - Measures when page becomes fully interactive

3. **Largest Contentful Paint (LCP)**
   - Target: < 2500ms
   - Measures when main content is visible

4. **Cumulative Layout Shift (CLS)**
   - Target: < 0.1
   - Measures visual stability

5. **Frame Rate**
   - Target: 60fps
   - Measures animation smoothness

## Best Practices

### For Future Development

1. **Images**
   - Use WebP format for raster images
   - Provide multiple sizes for responsive images
   - Lazy load images below the fold
   - Use SVG for icons (scalable, small file size)

2. **JavaScript**
   - Code split by route
   - Lazy load non-critical components
   - Minimize third-party dependencies
   - Tree-shake unused code

3. **CSS**
   - Use Tailwind's purge feature to remove unused styles
   - Minimize custom CSS
   - Use CSS containment for isolated components

4. **Animations**
   - Only animate `transform` and `opacity`
   - Use `will-change` sparingly (only for active animations)
   - Respect `prefers-reduced-motion`
   - Keep animations under 300ms for UI feedback

5. **Network**
   - Enable compression (Brotli/Gzip)
   - Use CDN for static assets
   - Implement caching strategies
   - Minimize API calls on initial load

## Troubleshooting

### Slow Initial Load

1. Check bundle size: `pnpm --filter @trivia-nft/web build --analyze`
2. Verify lazy loading is working
3. Check for large dependencies
4. Profile with Chrome DevTools Performance tab

### Janky Animations

1. Check if animating layout properties
2. Verify GPU acceleration is enabled
3. Check for JavaScript blocking main thread
4. Use Chrome DevTools Performance tab to identify bottlenecks

### High CLS Score

1. Reserve space for dynamic content
2. Avoid inserting content above existing content
3. Use `aspect-ratio` for images
4. Preload fonts to avoid FOIT/FOUT

## Testing on Various Devices

### Desktop
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile
- iOS Safari (iOS 14+)
- Chrome Mobile (Android 10+)
- Various screen sizes (375px to 1440px)

### Network Conditions
- Fast 3G
- Slow 3G
- Offline (PWA)

## Results

After implementing these optimizations, the landing page should achieve:

- ✅ FCP < 1000ms
- ✅ TTI < 2000ms
- ✅ LCP < 2500ms
- ✅ CLS < 0.1
- ✅ 60fps animations
- ✅ Accessible with reduced motion support
- ✅ Efficient network usage

## References

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [CSS Animation Performance](https://web.dev/animations-guide/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
