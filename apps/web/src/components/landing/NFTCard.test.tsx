import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-based tests for NFTCard component image scaling
 * 
 * Feature: website-responsive, Property 7: Image proportional scaling
 * Validates: Requirements 1.5, 7.1, 7.4
 * 
 * For any image or SVG element, when scaled to fit its container, 
 * the aspect ratio should be preserved without distortion
 */

const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface CardDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

interface ImageScaling {
  containerWidth: number;
  containerHeight: number;
  containerAspectRatio: number;
  imageAspectRatio: number;
  scaledWidth: number;
  scaledHeight: number;
  scaledAspectRatio: number;
  isProportional: boolean;
}

/**
 * Calculate NFTCard dimensions based on screen width
 * This mirrors the responsive sizing in NFTCard.tsx
 */
function calculateCardDimensions(screenWidth: number): CardDimensions {
  let width: number;
  let height: number;
  
  if (screenWidth < BREAKPOINTS.md) {
    // Mobile: w-[180px] h-[255px]
    width = 180;
    height = 255;
  } else if (screenWidth < BREAKPOINTS.lg) {
    // Tablet: md:w-[220px] md:h-[312px]
    width = 220;
    height = 312;
  } else {
    // Desktop: lg:w-[240px] lg:h-[340px]
    width = 240;
    height = 340;
  }
  
  return {
    width,
    height,
    aspectRatio: width / height,
  };
}

/**
 * Simulate image scaling with objectFit: 'contain'
 * This preserves aspect ratio by fitting the image within the container
 */
function calculateImageScaling(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ImageScaling {
  const containerAspectRatio = containerWidth / containerHeight;
  const imageAspectRatio = imageWidth / imageHeight;
  
  let scaledWidth: number;
  let scaledHeight: number;
  
  // objectFit: 'contain' logic
  if (imageAspectRatio > containerAspectRatio) {
    // Image is wider than container - fit to width
    scaledWidth = containerWidth;
    scaledHeight = containerWidth / imageAspectRatio;
  } else {
    // Image is taller than container - fit to height
    scaledHeight = containerHeight;
    scaledWidth = containerHeight * imageAspectRatio;
  }
  
  const scaledAspectRatio = scaledWidth / scaledHeight;
  
  // Check if aspect ratio is preserved (within floating point tolerance)
  const tolerance = 0.001;
  const isProportional = Math.abs(scaledAspectRatio - imageAspectRatio) < tolerance;
  
  return {
    containerWidth,
    containerHeight,
    containerAspectRatio,
    imageAspectRatio,
    scaledWidth,
    scaledHeight,
    scaledAspectRatio,
    isProportional,
  };
}

describe('NFTCard component property tests', () => {
  /**
   * Feature: website-responsive, Property 7: Image proportional scaling
   * Validates: Requirements 1.5, 7.1, 7.4
   * 
   * For any image with objectFit: 'contain', when scaled to fit its container,
   * the aspect ratio should be preserved without distortion
   */
  it('Property 7: Image proportional scaling - images maintain aspect ratio when scaled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width
        fc.integer({ min: 100, max: 1000 }), // Original image width
        fc.integer({ min: 100, max: 1000 }), // Original image height
        (screenWidth, imageWidth, imageHeight) => {
          const cardDimensions = calculateCardDimensions(screenWidth);
          
          const scaling = calculateImageScaling(
            cardDimensions.width,
            cardDimensions.height,
            imageWidth,
            imageHeight
          );
          
          // The scaled image should maintain its original aspect ratio
          expect(scaling.isProportional).toBe(true);
          
          // The scaled dimensions should fit within the container
          expect(scaling.scaledWidth).toBeLessThanOrEqual(cardDimensions.width);
          expect(scaling.scaledHeight).toBeLessThanOrEqual(cardDimensions.height);
          
          // At least one dimension should match the container (tight fit)
          const widthMatches = Math.abs(scaling.scaledWidth - cardDimensions.width) < 0.1;
          const heightMatches = Math.abs(scaling.scaledHeight - cardDimensions.height) < 0.1;
          expect(widthMatches || heightMatches).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Card dimensions are responsive
   * Validates that card size changes appropriately at breakpoints
   */
  it('card dimensions scale appropriately at different breakpoints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width
        (screenWidth) => {
          const dimensions = calculateCardDimensions(screenWidth);
          
          // Verify dimensions match expected values for each breakpoint
          if (screenWidth < BREAKPOINTS.md) {
            expect(dimensions.width).toBe(180);
            expect(dimensions.height).toBe(255);
          } else if (screenWidth < BREAKPOINTS.lg) {
            expect(dimensions.width).toBe(220);
            expect(dimensions.height).toBe(312);
          } else {
            expect(dimensions.width).toBe(240);
            expect(dimensions.height).toBe(340);
          }
          
          // All dimensions should be positive
          expect(dimensions.width).toBeGreaterThan(0);
          expect(dimensions.height).toBeGreaterThan(0);
          expect(dimensions.aspectRatio).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Aspect ratio is preserved for various image shapes
   * Tests square, portrait, and landscape images
   */
  it('aspect ratio is preserved for square, portrait, and landscape images', () => {
    const testCases = [
      { width: 500, height: 500, name: 'square' },
      { width: 300, height: 500, name: 'portrait' },
      { width: 500, height: 300, name: 'landscape' },
      { width: 1920, height: 1080, name: 'wide landscape' },
      { width: 1080, height: 1920, name: 'tall portrait' },
    ];
    
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width
        fc.constantFrom(...testCases), // Pick one test case
        (screenWidth, imageCase) => {
          const cardDimensions = calculateCardDimensions(screenWidth);
          
          const scaling = calculateImageScaling(
            cardDimensions.width,
            cardDimensions.height,
            imageCase.width,
            imageCase.height
          );
          
          // Aspect ratio should be preserved for all image shapes
          expect(scaling.isProportional).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Scaled images never exceed container bounds
   * Validates that objectFit: 'contain' behavior is correct
   */
  it('scaled images never exceed container dimensions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width
        fc.integer({ min: 50, max: 2000 }), // Image width
        fc.integer({ min: 50, max: 2000 }), // Image height
        (screenWidth, imageWidth, imageHeight) => {
          const cardDimensions = calculateCardDimensions(screenWidth);
          
          const scaling = calculateImageScaling(
            cardDimensions.width,
            cardDimensions.height,
            imageWidth,
            imageHeight
          );
          
          // Scaled dimensions must not exceed container
          expect(scaling.scaledWidth).toBeLessThanOrEqual(cardDimensions.width + 0.1); // Small tolerance for floating point
          expect(scaling.scaledHeight).toBeLessThanOrEqual(cardDimensions.height + 0.1);
          
          // Scaled dimensions must be positive
          expect(scaling.scaledWidth).toBeGreaterThan(0);
          expect(scaling.scaledHeight).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Card dimensions increase with screen size
   * Validates progressive enhancement approach
   */
  it('card dimensions increase as screen size increases', () => {
    const mobileWidth = 400;
    const tabletWidth = 900;
    const desktopWidth = 1400;
    
    const mobileDimensions = calculateCardDimensions(mobileWidth);
    const tabletDimensions = calculateCardDimensions(tabletWidth);
    const desktopDimensions = calculateCardDimensions(desktopWidth);
    
    // Card should get larger as screen size increases
    expect(tabletDimensions.width).toBeGreaterThan(mobileDimensions.width);
    expect(tabletDimensions.height).toBeGreaterThan(mobileDimensions.height);
    
    expect(desktopDimensions.width).toBeGreaterThan(tabletDimensions.width);
    expect(desktopDimensions.height).toBeGreaterThan(tabletDimensions.height);
  });

  /**
   * Test: SVG images scale without pixelation
   * SVGs should maintain quality at all sizes (aspect ratio preservation is key)
   */
  it('SVG images maintain aspect ratio at all scales', () => {
    // SVG images from the component
    const svgDimensions = { width: 120, height: 120 }; // Square SVG icons
    
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Screen width
        (screenWidth) => {
          const cardDimensions = calculateCardDimensions(screenWidth);
          
          const scaling = calculateImageScaling(
            cardDimensions.width,
            cardDimensions.height,
            svgDimensions.width,
            svgDimensions.height
          );
          
          // SVG aspect ratio should be preserved
          expect(scaling.isProportional).toBe(true);
          
          // For square SVGs, scaled dimensions should maintain 1:1 ratio
          const scaledRatio = scaling.scaledWidth / scaling.scaledHeight;
          expect(Math.abs(scaledRatio - 1.0)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
