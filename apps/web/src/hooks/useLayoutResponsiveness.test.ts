import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useResponsive } from './useResponsive';
import { Dimensions } from 'react-native';

/**
 * Property-Based Tests for Layout Responsiveness
 * 
 * **Feature: website-responsive, Property 12: Layout responsiveness**
 * **Validates: Requirements 4.2, 5.1, 5.2**
 * 
 * For any component, when the viewport size changes, the component should 
 * update its layout within one render cycle.
 */

describe('Layout Responsiveness Property Tests', () => {
  let dimensionsListeners: Array<(args: { window: { width: number; height: number } }) => void> = [];

  beforeEach(() => {
    dimensionsListeners = [];
    
    // Mock Dimensions.addEventListener
    vi.spyOn(Dimensions, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'change') {
        dimensionsListeners.push(handler);
      }
      return {
        remove: () => {
          const index = dimensionsListeners.indexOf(handler);
          if (index > -1) {
            dimensionsListeners.splice(index, 1);
          }
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dimensionsListeners = [];
  });

  /**
   * Feature: website-responsive, Property 12: Layout responsiveness
   * Validates: Requirements 4.2, 5.1, 5.2
   * 
   * For any component, when the viewport size changes, the component should 
   * update its layout within one render cycle.
   */
  it('Property 12: Layout responsiveness - viewport changes update layout in one render cycle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // initial width
        fc.integer({ min: 480, max: 1440 }), // initial height
        fc.integer({ min: 320, max: 2560 }), // new width
        fc.integer({ min: 480, max: 1440 }), // new height
        (initialWidth, initialHeight, newWidth, newHeight) => {
          // Skip if dimensions are the same
          if (initialWidth === newWidth && initialHeight === newHeight) {
            return true;
          }

          // Mock initial dimensions
          vi.spyOn(Dimensions, 'get').mockReturnValue({
            width: initialWidth,
            height: initialHeight,
            scale: 1,
            fontScale: 1,
          });

          // Render the hook
          const { result, rerender } = renderHook(() => useResponsive());

          // Capture initial state
          const initialBreakpoint = result.current.breakpoint;
          const initialIsMobile = result.current.isMobile;
          const initialIsTablet = result.current.isTablet;
          const initialIsDesktop = result.current.isDesktop;

          // Simulate viewport change
          act(() => {
            // Update Dimensions.get to return new dimensions
            vi.spyOn(Dimensions, 'get').mockReturnValue({
              width: newWidth,
              height: newHeight,
              scale: 1,
              fontScale: 1,
            });

            // Trigger dimension change event
            dimensionsListeners.forEach(listener => {
              listener({
                window: { width: newWidth, height: newHeight },
              });
            });
          });

          // After one render cycle, the layout should be updated
          // Verify the hook returns the new dimensions
          expect(result.current.width).toBe(newWidth);
          expect(result.current.height).toBe(newHeight);

          // Verify breakpoint is correctly calculated for new width
          const expectedBreakpoint = 
            newWidth >= 1536 ? '2xl' :
            newWidth >= 1280 ? 'xl' :
            newWidth >= 1024 ? 'lg' :
            newWidth >= 768 ? 'md' : 'sm';
          
          expect(result.current.breakpoint).toBe(expectedBreakpoint);

          // Verify device flags are correctly updated
          const expectedIsMobile = newWidth < 768;
          const expectedIsTablet = newWidth >= 768 && newWidth < 1024;
          const expectedIsDesktop = newWidth >= 1024;

          expect(result.current.isMobile).toBe(expectedIsMobile);
          expect(result.current.isTablet).toBe(expectedIsTablet);
          expect(result.current.isDesktop).toBe(expectedIsDesktop);

          // Verify orientation is correctly updated
          const expectedOrientation = newHeight > newWidth ? 'portrait' : 'landscape';
          expect(result.current.orientation).toBe(expectedOrientation);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify layout updates are synchronous
   * 
   * This ensures that when dimensions change, the hook updates immediately
   * without requiring additional render cycles or async operations.
   */
  it('layout updates are synchronous within the same render cycle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // width1
        fc.integer({ min: 480, max: 1440 }), // height1
        fc.integer({ min: 320, max: 2560 }), // width2
        fc.integer({ min: 480, max: 1440 }), // height2
        (width1, height1, width2, height2) => {
          // Skip if dimensions are the same
          if (width1 === width2 && height1 === height2) {
            return true;
          }

          // Mock initial dimensions
          vi.spyOn(Dimensions, 'get').mockReturnValue({
            width: width1,
            height: height1,
            scale: 1,
            fontScale: 1,
          });

          const { result } = renderHook(() => useResponsive());

          // Capture state before change
          const stateBefore = { ...result.current };

          // Change dimensions
          act(() => {
            vi.spyOn(Dimensions, 'get').mockReturnValue({
              width: width2,
              height: height2,
              scale: 1,
              fontScale: 1,
            });

            dimensionsListeners.forEach(listener => {
              listener({
                window: { width: width2, height: height2 },
              });
            });
          });

          // State should be updated immediately after act()
          const stateAfter = { ...result.current };

          // Verify the state has changed if dimensions changed
          if (width1 !== width2 || height1 !== height2) {
            expect(stateAfter.width).toBe(width2);
            expect(stateAfter.height).toBe(height2);
            
            // At least one property should have changed
            const hasChanged = 
              stateAfter.width !== stateBefore.width ||
              stateAfter.height !== stateBefore.height ||
              stateAfter.breakpoint !== stateBefore.breakpoint ||
              stateAfter.isMobile !== stateBefore.isMobile ||
              stateAfter.isTablet !== stateBefore.isTablet ||
              stateAfter.isDesktop !== stateBefore.isDesktop ||
              stateAfter.orientation !== stateBefore.orientation;

            expect(hasChanged).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Multiple rapid viewport changes
   * 
   * Verifies that the hook handles multiple rapid viewport changes correctly,
   * always reflecting the most recent dimensions.
   */
  it('handles multiple rapid viewport changes correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 2560 }),
            height: fc.integer({ min: 480, max: 1440 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (dimensionChanges) => {
          // Mock initial dimensions
          const initial = dimensionChanges[0];
          vi.spyOn(Dimensions, 'get').mockReturnValue({
            width: initial.width,
            height: initial.height,
            scale: 1,
            fontScale: 1,
          });

          const { result } = renderHook(() => useResponsive());

          // Apply all dimension changes
          act(() => {
            for (let i = 1; i < dimensionChanges.length; i++) {
              const dims = dimensionChanges[i];
              vi.spyOn(Dimensions, 'get').mockReturnValue({
                width: dims.width,
                height: dims.height,
                scale: 1,
                fontScale: 1,
              });

              dimensionsListeners.forEach(listener => {
                listener({
                  window: { width: dims.width, height: dims.height },
                });
              });
            }
          });

          // After all changes, should reflect the last dimensions
          const lastDims = dimensionChanges[dimensionChanges.length - 1];
          expect(result.current.width).toBe(lastDims.width);
          expect(result.current.height).toBe(lastDims.height);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
