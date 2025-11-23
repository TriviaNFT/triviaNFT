#!/usr/bin/env node
/**
 * Performance measurement script for landing page
 * Measures TTI, FCP, and other Web Vitals metrics
 */

import { chromium } from '@playwright/test';

const URL = process.env.TEST_URL || 'http://localhost:8081';
const RUNS = 3; // Number of test runs to average

async function measurePerformance() {
  console.log(`\n🔍 Measuring performance for: ${URL}\n`);
  
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (let i = 0; i < RUNS; i++) {
    console.log(`Run ${i + 1}/${RUNS}...`);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect performance metrics
    await page.goto(URL, { waitUntil: 'networkidle' });

    // Get Web Vitals and performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          collectMetrics();
        } else {
          window.addEventListener('load', collectMetrics);
        }

        function collectMetrics() {
          const perfData = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');
          
          const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          const lcp = performance.getEntriesByType('largest-contentful-paint').pop();

          // Calculate TTI approximation (when main thread is idle)
          const tti = perfData.domInteractive;

          resolve({
            fcp: fcp ? fcp.startTime : 0,
            lcp: lcp ? lcp.startTime : 0,
            tti: tti,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalLoadTime: perfData.loadEventEnd - perfData.fetchStart,
          });
        }
      });
    });

    results.push(metrics);
    await context.close();
  }

  await browser.close();

  // Calculate averages
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  const averages = {
    fcp: avg(results.map(r => r.fcp)),
    lcp: avg(results.map(r => r.lcp)),
    tti: avg(results.map(r => r.tti)),
    domContentLoaded: avg(results.map(r => r.domContentLoaded)),
    loadComplete: avg(results.map(r => r.loadComplete)),
    totalLoadTime: avg(results.map(r => r.totalLoadTime)),
  };

  // Display results
  console.log('\n📊 Performance Results (averaged over', RUNS, 'runs):\n');
  console.log(`  First Contentful Paint (FCP): ${averages.fcp.toFixed(2)}ms`);
  console.log(`  Largest Contentful Paint (LCP): ${averages.lcp.toFixed(2)}ms`);
  console.log(`  Time to Interactive (TTI): ${averages.tti.toFixed(2)}ms`);
  console.log(`  DOM Content Loaded: ${averages.domContentLoaded.toFixed(2)}ms`);
  console.log(`  Load Complete: ${averages.loadComplete.toFixed(2)}ms`);
  console.log(`  Total Load Time: ${averages.totalLoadTime.toFixed(2)}ms`);

  // Check against targets
  console.log('\n✅ Target Compliance:\n');
  console.log(`  FCP < 1000ms: ${averages.fcp < 1000 ? '✓ PASS' : '✗ FAIL'} (${averages.fcp.toFixed(0)}ms)`);
  console.log(`  TTI < 2000ms: ${averages.tti < 2000 ? '✓ PASS' : '✗ FAIL'} (${averages.tti.toFixed(0)}ms)`);
  console.log(`  LCP < 2500ms: ${averages.lcp < 2500 ? '✓ PASS' : '✗ FAIL'} (${averages.lcp.toFixed(0)}ms)`);

  // Exit with error if targets not met
  if (averages.fcp >= 1000 || averages.tti >= 2000) {
    console.log('\n⚠️  Performance targets not met!');
    process.exit(1);
  } else {
    console.log('\n🎉 All performance targets met!');
  }
}

measurePerformance().catch(console.error);
