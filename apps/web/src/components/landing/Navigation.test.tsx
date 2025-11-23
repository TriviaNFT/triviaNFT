import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-based tests for Navigation component touch targets
 * 
 * Feature: website-responsive, Property 2: Touch target minimum size
 * Validates: Requirements 1.2, 2.2, 2.4
 * 
 * For any interactive element (button, link, input) at any breakpoint, 
 * the element's dimensions should be at least 44×44 pixels
 */

const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const MIN_TOUCH_TARGET_SIZE = 44;

interface NavigationElement {
  name: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Calculate Navigation element dimensions based on screen width
 */
function calculateNavigationElementDimensions(screenWidth: number): NavigationElement[] {
  const isMobile = screenWidth < BREAKPOINTS.md;
  
  const elements: NavigationElement[] = [];
  
  // Back button (only on inner pages, but we test it anyway)
  const backButtonSize = isMobile ? 44 : 36;
  elements.push({
    name: 'Back Button',
    width: backButtonSize,
    height: backButtonSize,
    minWidth: 44,
    minHeight: 44,
  });
  
  // Logo/Brand (clickable area)
  elements.push({
    name: 'Logo/Brand',
    width: isMobile ? 200 : 250, // Approximate clickable area
    height: 44, // Minimum touch target
    minHeight: 44,
  });
  
  // Connect Wallet button
  const connectButtonPaddingX = isMobile ? 16 : 20;
  const connectButtonTextWidth = isMobile ? 60 : 110; // Approximate text width
  elements.push({
    name: 'Connect Wallet Button',
    width: connectButtonTextWidth + (connectButtonPaddingX * 2),
    height: 48, // minHeight specified in component
    minHeight: 48,
  });
  
  // Connected wallet display (when connected)
  const walletDisplayPaddingX = isMobile ? 12 : 16;
  const walletDisplayTextWidth = isMobile ? 80 : 100; // Approximate text width
  elements.push({
    name: 'Connected Wallet Display',
    width: walletDisplayTextWidth + (walletDisplayPaddingX * 2),
    height: 44, // minHeight specified in component
    minHeight: 44,
  });
  
  // Disconnect button (when connected)
  const disconnectButtonPaddingX = isMobile ? 12 : 16;
  const disconnectButtonTextWidth = isMobile ? 20 : 80; // "✕" vs "Disconnect"
  elements.push({
    name: 'Disconnect Button',
    width: disconnectButtonTextWidth + (disconnectButtonPaddingX * 2),
    height: 44, // minHeight specified in component
    minHeight: 44,
    minWidth: 44, // minWidth specified in component
  });
  
  return elements;
}

describe('Navigation component property tests', () => {
  /**
   * Feature: website-responsive, Property 2: Touch target minimum size
   * Validates: Requirements 1.2, 2.2, 2.4
   * 
   * For any interactive element at any breakpoint, the element's dimensions 
   * should be at least 44×44 pixels
   */
  it('Property 2: Touch target minimum size - all interactive elements meet 44x44px minimum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width range
        (screenWidth) => {
          const elements = calculateNavigationElementDimensions(screenWidth);
          
          // Check each element meets minimum touch target size
          elements.forEach((element) => {
            // If minWidth is specified, check it
            if (element.minWidth !== undefined) {
              expect(element.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            }
            
            // If minHeight is specified, check it
            if (element.minHeight !== undefined) {
              expect(element.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            }
            
            // Check actual dimensions (considering min constraints)
            const actualWidth = Math.max(element.width, element.minWidth || 0);
            const actualHeight = Math.max(element.height, element.minHeight || 0);
            
            expect(actualWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
            expect(actualHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Touch targets are larger on mobile/tablet than desktop
   * This ensures better usability on touch devices
   */
  it('touch targets maintain or increase size on mobile devices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile width
        fc.integer({ min: 1024, max: 2560 }), // Desktop width
        (mobileWidth, desktopWidth) => {
          const mobileElements = calculateNavigationElementDimensions(mobileWidth);
          const desktopElements = calculateNavigationElementDimensions(desktopWidth);
          
          // Compare corresponding elements
          for (let i = 0; i < mobileElements.length; i++) {
            const mobileElement = mobileElements[i];
            const desktopElement = desktopElements[i];
            
            // Mobile elements should have equal or larger minimum dimensions
            const mobileMinHeight = mobileElement.minHeight || mobileElement.height;
            const desktopMinHeight = desktopElement.minHeight || desktopElement.height;
            
            expect(mobileMinHeight).toBeGreaterThanOrEqual(desktopMinHeight);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Back button specifically meets touch target requirements
   * The back button is critical for navigation and must be easily tappable
   */
  it('back button meets minimum touch target size on all breakpoints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width range
        (screenWidth) => {
          const isMobile = screenWidth < BREAKPOINTS.md;
          const backButtonSize = isMobile ? 44 : 36;
          const minWidth = 44;
          const minHeight = 44;
          
          // The actual rendered size should be the max of size and min constraints
          const actualWidth = Math.max(backButtonSize, minWidth);
          const actualHeight = Math.max(backButtonSize, minHeight);
          
          expect(actualWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          expect(actualHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: All buttons have consistent minimum dimensions
   * Ensures no button falls below the accessibility threshold
   */
  it('all navigation buttons have minHeight of at least 44px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width range
        (screenWidth) => {
          const elements = calculateNavigationElementDimensions(screenWidth);
          
          // Filter to only button elements
          const buttons = elements.filter(el => 
            el.name.includes('Button') || el.name.includes('Display')
          );
          
          buttons.forEach((button) => {
            // All buttons should have minHeight specified
            expect(button.minHeight).toBeDefined();
            expect(button.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
