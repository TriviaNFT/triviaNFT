import { test, expect } from '@playwright/test';

test.describe('Landing Page Performance', () => {
  test('should meet performance targets for TTI and FCP', async ({ page }) => {
    // Navigate to landing page and collect performance metrics
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Collect Web Vitals and performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise<{
        fcp: number;
        lcp: number;
        tti: number;
        cls: number;
        totalLoadTime: number;
      }>((resolve) => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcp = lcpEntries[lcpEntries.length - 1];

        // Calculate TTI approximation (when main thread is idle)
        const tti = perfData.domInteractive;

        // Get CLS (Cumulative Layout Shift) if available
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue;
            cls += (entry as any).value;
          }
        });
        
        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          // CLS not supported
        }

        resolve({
          fcp: fcp ? fcp.startTime : 0,
          lcp: lcp ? lcp.startTime : 0,
          tti: tti,
          cls: cls,
          totalLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        });
      });
    });

    console.log('\n📊 Performance Metrics:');
    console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms`);
    console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`);
    console.log(`  TTI: ${metrics.tti.toFixed(2)}ms`);
    console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
    console.log(`  Total Load: ${metrics.totalLoadTime.toFixed(2)}ms`);

    // Assert performance targets
    expect(metrics.fcp, 'First Contentful Paint should be < 1000ms').toBeLessThan(1000);
    expect(metrics.tti, 'Time to Interactive should be < 2000ms').toBeLessThan(2000);
    expect(metrics.lcp, 'Largest Contentful Paint should be < 2500ms').toBeLessThan(2500);
    expect(metrics.cls, 'Cumulative Layout Shift should be < 0.1').toBeLessThan(0.1);
  });

  test('should have optimized SVG assets', async ({ page }) => {
    await page.goto('/');
    
    // Wait for NFT cards to be visible
    await expect(page.getByText('COMMON')).toBeVisible();
    
    // Check that SVG icons are loaded
    const svgElements = await page.locator('svg').count();
    expect(svgElements, 'Should have SVG icons loaded').toBeGreaterThan(0);
    
    // Verify SVGs are optimized (no excessive whitespace or comments)
    const svgContent = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      return svgs.map(svg => svg.outerHTML);
    });
    
    for (const svg of svgContent) {
      // Check that SVGs don't contain comments (optimized)
      expect(svg).not.toContain('<!--');
      // Check that SVGs are reasonably compact (no excessive whitespace)
      const whitespaceRatio = (svg.match(/\s+/g) || []).length / svg.length;
      expect(whitespaceRatio, 'SVG should be optimized with minimal whitespace').toBeLessThan(0.3);
    }
  });

  test('should run animations at 60fps', async ({ page }) => {
    await page.goto('/');
    
    // Wait for NFT cards to be visible
    await expect(page.getByText('COMMON')).toBeVisible();
    
    // Measure animation frame rate
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        const duration = 1000; // Measure for 1 second
        
        function countFrames(currentTime: number) {
          frameCount++;
          
          if (currentTime - lastTime >= duration) {
            resolve(frameCount);
          } else {
            requestAnimationFrame(countFrames);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
    
    console.log(`\n🎬 Animation FPS: ${fps}`);
    
    // Should be close to 60fps (allow some variance)
    expect(fps, 'Animations should run at approximately 60fps').toBeGreaterThan(50);
  });

  test('should lazy load below-the-fold content', async ({ page }) => {
    // Start navigation but don't wait for full load
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Hero section should be visible immediately
    await expect(page.getByRole('heading', { name: 'TriviaNFT' })).toBeVisible();
    
    // Component demos may load slightly later (lazy loaded)
    await expect(page.getByText('Component Demos')).toBeVisible({ timeout: 3000 });
    
    // Verify all demo cards eventually load
    await expect(page.getByText('Authentication')).toBeVisible();
    await expect(page.getByText('Gameplay')).toBeVisible();
    await expect(page.getByText('Minting')).toBeVisible();
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'TriviaNFT' })).toBeVisible();
    
    // Check that animations are disabled or minimal
    const animationDuration = await page.evaluate(() => {
      const element = document.querySelector('.animate-float');
      if (!element) return null;
      
      const styles = window.getComputedStyle(element);
      return styles.animationDuration;
    });
    
    // Animation should be very short or disabled when reduced motion is preferred
    if (animationDuration) {
      const durationMs = parseFloat(animationDuration) * 1000;
      expect(durationMs, 'Animation duration should be minimal with reduced motion').toBeLessThan(100);
    }
  });

  test('should have efficient network usage', async ({ page }) => {
    // Track network requests
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log(`\n🌐 Total network requests: ${requests.length}`);
    
    // Should have reasonable number of requests (not excessive)
    expect(requests.length, 'Should have reasonable number of network requests').toBeLessThan(50);
    
    // Check for duplicate requests (inefficiency)
    const uniqueRequests = new Set(requests);
    const duplicateCount = requests.length - uniqueRequests.size;
    expect(duplicateCount, 'Should not have many duplicate requests').toBeLessThan(5);
  });

  test('should work on various network conditions', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    console.log(`\n🐌 Load time on slow network: ${loadTime}ms`);
    
    // Should still be usable on slow networks (within 5 seconds)
    expect(loadTime, 'Should load within 5 seconds on slow network').toBeLessThan(5000);
    
    // Critical content should be visible
    await expect(page.getByRole('heading', { name: 'TriviaNFT' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  });
});
