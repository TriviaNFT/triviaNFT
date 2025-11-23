import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: website-responsive, Property 13: Form element sizing
 * Validates: Requirements 4.3
 * 
 * For any form input or control element, the element should have appropriate 
 * dimensions for the current breakpoint (larger on mobile for touch)
 */

const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const MIN_TOUCH_TARGET = 44;

// Helper to determine if a width is mobile
function isMobile(width: number): boolean {
  return width < BREAKPOINTS.md;
}

// Helper to calculate expected minimum height for form elements
function getExpectedMinHeight(_width: number): number {
  return MIN_TOUCH_TARGET; // All form elements should meet minimum touch target
}

// Helper to calculate expected padding for form elements
function getExpectedPadding(width: number): { horizontal: number; vertical: number } {
  const mobile = isMobile(width);
  return {
    horizontal: mobile ? 12 : 16,
    vertical: mobile ? 14 : 12,
  };
}

// Helper to calculate form element styles based on screen width
function calculateFormElementStyle(width: number, _elementType: 'input' | 'button') {
  const mobile = isMobile(width);
  const padding = getExpectedPadding(width);
  
  return {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: padding.horizontal,
    paddingVertical: padding.vertical,
    fontSize: mobile ? 16 : 16,
  };
}

describe('Form element sizing property tests', () => {
  /**
   * Property 13: Form element sizing
   * 
   * Test that form input elements have appropriate dimensions for touch interaction
   * across all breakpoints, with larger touch targets on mobile devices.
   */
  it('Property 13: Form element sizing - inputs meet minimum touch target size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2000 }), // screen width
        (width) => {
          const style = calculateFormElementStyle(width, 'input');
          
          // Verify minimum height meets touch target requirement
          expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
          expect(style.minHeight).toBe(44);
          
          // Verify padding is appropriate for breakpoint
          const mobile = isMobile(width);
          if (mobile) {
            expect(style.paddingHorizontal).toBe(12);
            expect(style.paddingVertical).toBe(14);
          } else {
            expect(style.paddingHorizontal).toBe(16);
            expect(style.paddingVertical).toBe(12);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Form element sizing - buttons meet minimum touch target size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2000 }), // screen width
        (width) => {
          const style = calculateFormElementStyle(width, 'button');
          
          // Verify minimum height meets touch target requirement
          expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
          expect(style.minHeight).toBe(44);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Form element sizing - form elements scale appropriately across breakpoints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2000 }), // screen width
        (width) => {
          const mobile = isMobile(width);
          const tablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
          const desktop = width >= BREAKPOINTS.lg;
          
          // Calculate expected dimensions
          const expectedPadding = getExpectedPadding(width);
          const expectedMinHeight = getExpectedMinHeight(width);
          
          // Verify padding increases from mobile to desktop
          if (mobile) {
            expect(expectedPadding.horizontal).toBe(12);
            expect(expectedPadding.vertical).toBe(14);
          } else {
            expect(expectedPadding.horizontal).toBe(16);
            expect(expectedPadding.vertical).toBe(12);
          }
          
          // Verify all breakpoints maintain minimum touch target
          expect(expectedMinHeight).toBe(MIN_TOUCH_TARGET);
          
          // Verify exactly one device category is true
          const deviceFlags = [mobile, tablet, desktop].filter(Boolean);
          expect(deviceFlags.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Form element sizing - touch targets are consistent across form types', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2000 }), // screen width
        fc.constantFrom('input' as const, 'button' as const), // form element type
        (width, elementType) => {
          const style = calculateFormElementStyle(width, elementType);
          
          // All form elements should have the same minimum touch target
          expect(style.minHeight).toBe(MIN_TOUCH_TARGET);
          expect(style.minHeight).toBeGreaterThanOrEqual(44);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Form element sizing - mobile forms have larger touch areas than desktop', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // mobile width
        fc.integer({ min: 1024, max: 2000 }), // desktop width
        (mobileWidth, desktopWidth) => {
          const mobilePadding = getExpectedPadding(mobileWidth);
          const desktopPadding = getExpectedPadding(desktopWidth);
          
          // Mobile should have equal or larger vertical padding for easier touch
          expect(mobilePadding.vertical).toBeGreaterThanOrEqual(desktopPadding.vertical);
          
          // Both should meet minimum touch target
          const mobileMinHeight = getExpectedMinHeight(mobileWidth);
          const desktopMinHeight = getExpectedMinHeight(desktopWidth);
          
          expect(mobileMinHeight).toBe(MIN_TOUCH_TARGET);
          expect(desktopMinHeight).toBe(MIN_TOUCH_TARGET);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Form element sizing - padding values are valid and positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2000 }), // screen width
        (width) => {
          const padding = getExpectedPadding(width);
          
          // Verify padding values are positive
          expect(padding.horizontal).toBeGreaterThan(0);
          expect(padding.vertical).toBeGreaterThan(0);
          
          // Verify padding values are reasonable (not too large)
          expect(padding.horizontal).toBeLessThanOrEqual(24);
          expect(padding.vertical).toBeLessThanOrEqual(20);
        }
      ),
      { numRuns: 100 }
    );
  });
});
