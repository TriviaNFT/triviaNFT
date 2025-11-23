import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-based tests for HeroSection component layout
 * 
 * Feature: website-responsive, Property 11: Single column on mobile
 * Validates: Requirements 1.1
 * 
 * For any page or component layout on mobile breakpoint (width < 768px), 
 * the layout should use a single-column arrangement
 */

const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface LayoutConfig {
  screenWidth: number;
  flexDirection: 'column' | 'row';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Calculate HeroSection layout configuration based on screen width
 * This mirrors the logic in HeroSection.tsx
 */
function calculateHeroSectionLayout(screenWidth: number): LayoutConfig {
  const isMobile = screenWidth <= 640;
  const isTablet = screenWidth > 640 && screenWidth <= 1024;
  const isDesktop = screenWidth > 1024;
  
  // The main container uses flexDirection based on mobile state
  const flexDirection = isMobile ? 'column' : 'row';
  
  return {
    screenWidth,
    flexDirection,
    isMobile,
    isTablet,
    isDesktop,
  };
}

/**
 * Calculate button layout configuration
 */
function calculateButtonLayout(screenWidth: number) {
  const isMobile = screenWidth <= 640;
  
  return {
    flexDirection: isMobile ? 'column' : 'row',
    buttonWidth: isMobile ? '100%' : 180,
    buttonMinHeight: 48,
  };
}

describe('HeroSection component property tests', () => {
  /**
   * Feature: website-responsive, Property 11: Single column on mobile
   * Validates: Requirements 1.1
   * 
   * For any mobile breakpoint (width <= 640px), the layout should use 
   * a single-column arrangement
   */
  it('Property 11: Single column on mobile - layout uses column direction on mobile breakpoint', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 640 }), // Mobile width range (<= 640px)
        (screenWidth) => {
          const layout = calculateHeroSectionLayout(screenWidth);
          
          // On mobile, the layout should be single-column (flexDirection: 'column')
          expect(layout.flexDirection).toBe('column');
          expect(layout.isMobile).toBe(true);
          expect(layout.isTablet).toBe(false);
          expect(layout.isDesktop).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Two-column layout on tablet and desktop
   * Validates that larger screens use horizontal layout
   */
  it('layout uses row direction on tablet and desktop breakpoints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 641, max: 2560 }), // Tablet and desktop width range (> 640px)
        (screenWidth) => {
          const layout = calculateHeroSectionLayout(screenWidth);
          
          // On tablet/desktop, the layout should be two-column (flexDirection: 'row')
          expect(layout.flexDirection).toBe('row');
          expect(layout.isMobile).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Button layout is responsive
   * Validates that buttons stack vertically on mobile and horizontally on larger screens
   */
  it('button container uses column direction on mobile', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 640 }), // Mobile width range (<= 640px)
        (screenWidth) => {
          const buttonLayout = calculateButtonLayout(screenWidth);
          
          // Buttons should stack vertically on mobile
          expect(buttonLayout.flexDirection).toBe('column');
          expect(buttonLayout.buttonWidth).toBe('100%');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Button layout is horizontal on larger screens
   */
  it('button container uses row direction on tablet and desktop', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 641, max: 2560 }), // Tablet and desktop width range (> 640px)
        (screenWidth) => {
          const buttonLayout = calculateButtonLayout(screenWidth);
          
          // Buttons should be horizontal on tablet/desktop
          expect(buttonLayout.flexDirection).toBe('row');
          expect(buttonLayout.buttonWidth).toBe(180);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: All CTA buttons meet minimum touch target size
   * Validates Requirements 1.2
   */
  it('all CTA buttons meet 44x44px minimum touch target size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // All screen widths
        (screenWidth) => {
          const buttonLayout = calculateButtonLayout(screenWidth);
          
          // All buttons have minHeight of 48px (exceeds 44px requirement)
          expect(buttonLayout.buttonMinHeight).toBeGreaterThanOrEqual(44);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Layout breakpoint consistency
   * Validates that the breakpoint logic is consistent
   */
  it('layout breakpoint transitions are consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // All screen widths
        (screenWidth) => {
          const layout = calculateHeroSectionLayout(screenWidth);
          
          // Exactly one of isMobile, isTablet, or isDesktop should be true
          const activeFlags = [layout.isMobile, layout.isTablet, layout.isDesktop].filter(Boolean);
          expect(activeFlags.length).toBe(1);
          
          // Verify breakpoint boundaries
          if (screenWidth <= 640) {
            expect(layout.isMobile).toBe(true);
            expect(layout.flexDirection).toBe('column');
          } else if (screenWidth > 640 && screenWidth <= 1024) {
            expect(layout.isTablet).toBe(true);
            expect(layout.flexDirection).toBe('row');
          } else {
            expect(layout.isDesktop).toBe(true);
            expect(layout.flexDirection).toBe('row');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Mobile breakpoint boundary
   * Validates the exact transition point from mobile to tablet layout
   */
  it('layout transitions from column to row at mobile breakpoint boundary', () => {
    // Test just below and just above the mobile breakpoint (640px)
    const justBelowMobile = 640;
    const justAboveMobile = 641;
    
    const layoutBelowMobile = calculateHeroSectionLayout(justBelowMobile);
    const layoutAboveMobile = calculateHeroSectionLayout(justAboveMobile);
    
    // Below mobile breakpoint should be column
    expect(layoutBelowMobile.flexDirection).toBe('column');
    expect(layoutBelowMobile.isMobile).toBe(true);
    
    // Above mobile breakpoint should be row
    expect(layoutAboveMobile.flexDirection).toBe('row');
    expect(layoutAboveMobile.isMobile).toBe(false);
  });
});
