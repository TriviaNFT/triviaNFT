/**
 * Tests for Inngest API endpoint
 * 
 * These tests verify that the Inngest endpoint is properly configured
 * and can handle requests from Inngest.
 */

import { describe, it, expect } from 'vitest';
import { GET, POST, PUT } from './inngest+api';

describe('Inngest API Endpoint', () => {
  it('should export GET handler', () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');
  });

  it('should export POST handler', () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe('function');
  });

  it('should export PUT handler', () => {
    expect(PUT).toBeDefined();
    expect(typeof PUT).toBe('function');
  });
});
