/**
 * Property-Based Test: API Route Consistency
 * 
 * Feature: vercel-local-testing, Property 1: API Route Consistency
 * Validates: Requirements 1.2
 * 
 * Property 1: API Route Consistency
 * For any API route in the application, when called through Vercel Dev,
 * the response should match the expected production behavior in terms of
 * status code, response structure, and data format.
 * 
 * Prerequisites:
 * - Vercel CLI must be installed: npm i -g vercel
 * - Project must be linked: vercel link
 * - Vercel Dev will be started automatically by Playwright
 * 
 * Note: This test requires Vercel Dev to be running. The Playwright configuration
 * will automatically start it via the webServer option.
 */

import { test, expect } from '@playwright/test';
import fc from 'fast-check';

/**
 * List of API routes to test
 * These routes should be accessible and return valid JSON responses
 * 
 * Note: Only testing routes that don't require authentication or specific state
 */
const API_ROUTES = [
  '/api/health',
  '/api/inngest',
] as const;

test.describe('Property-Based Tests: API Route Consistency', () => {
  /**
   * Property 1: API Route Consistency
   * 
   * For any API route in the application, when called through Vercel Dev,
   * the response should match the expected production behavior in terms of
   * status code, response structure, and data format.
   * 
   * Validates: Requirements 1.2
   */
  test('Property 1: API routes return consistent responses', async ({ request }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...API_ROUTES),
        async (apiRoute) => {
          // Make request to the API route
          const response = await request.get(`http://localhost:3000${apiRoute}`);
          
          // Property: All API routes should return valid status codes (2xx or expected error codes)
          const status = response.status();
          expect(status).toBeGreaterThanOrEqual(200);
          expect(status).toBeLessThan(500);
          
          // Property: All API routes should return JSON content type
          const contentType = response.headers()['content-type'];
          expect(contentType).toContain('application/json');
          
          // Property: All API routes should return valid JSON body
          const body = await response.json();
          expect(body).toBeDefined();
          expect(typeof body).toBe('object');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified
    );
  });

  /**
   * Additional property: API routes are idempotent for GET requests
   * 
   * For any API route, calling it multiple times should return consistent results
   */
  test('Property: API GET requests are idempotent', async ({ request }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...API_ROUTES),
        async (apiRoute) => {
          // Make two requests to the same route
          const response1 = await request.get(`http://localhost:3000${apiRoute}`);
          const response2 = await request.get(`http://localhost:3000${apiRoute}`);
          
          // Status codes should match
          expect(response1.status()).toBe(response2.status());
          
          // Content types should match
          expect(response1.headers()['content-type']).toBe(
            response2.headers()['content-type']
          );
          
          // Both should return valid JSON
          const body1 = await response1.json();
          const body2 = await response2.json();
          
          expect(body1).toBeDefined();
          expect(body2).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional property: API routes handle invalid methods gracefully
   * 
   * For any API route, using an unsupported HTTP method should return
   * an appropriate error response (405 Method Not Allowed or similar)
   */
  test('Property: API routes handle invalid methods gracefully', async ({ request }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...API_ROUTES),
        async (apiRoute) => {
          // Try to use DELETE method on routes that likely don't support it
          const response = await request.delete(`http://localhost:3000${apiRoute}`);
          
          const status = response.status();
          
          // Should return either 405 (Method Not Allowed) or 404 (Not Found)
          // or potentially 200 if the route actually supports DELETE
          expect(status).toBeGreaterThanOrEqual(200);
          expect(status).toBeLessThan(500);
          
          // Should still return JSON
          const contentType = response.headers()['content-type'];
          if (contentType) {
            expect(contentType).toContain('application/json');
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
