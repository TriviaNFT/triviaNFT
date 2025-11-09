# Touch Interaction Guide

## Overview

This document outlines the touch interaction standards implemented across the TriviaNFT web application to ensure optimal mobile usability and accessibility.

## Touch Target Standards

### Minimum Touch Target Size

All interactive elements follow the **44x44px minimum touch target** guideline as recommended by:
- Apple Human Interface Guidelines
- Material Design Guidelines
- WCAG 2.1 Success Criterion 2.5.5

### Implementation

#### Buttons
All button sizes include minimum touch targets:
- **Small**: `min-h-[44px]` - Minimum 44px height
- **Medium**: `min-h-[44px]` - Minimum 44px height
- **Large**: `min-h-[48px]` - Larger for emphasis

#### Cards and Pressable Areas
- CategoryCard: `min-h-[140px]` with full card pressable area
- TouchableCard: `min-h-[44px]` for all variants
- Answer options in QuestionCard: `min-h-[44px]`

## Touch Feedback

### Visual Feedback States

All interactive elements provide immediate visual feedback:

1. **Scale Animation**: `active:scale-[0.98]`
   - Subtle scale-down effect on press
   - Creates tactile feel on touch devices

2. **Opacity Changes**: `active:opacity-80`
   - Used for cards and secondary interactions
   - Provides clear pressed state

3. **Color Changes**: `active:bg-{color}`
   - Primary buttons darken on press
   - Provides clear state change

### Transition Timing

All touch feedback uses consistent timing:
```css
transition-all duration-150
```
- 150ms provides immediate but smooth feedback
- Prevents jarring instant changes

## Swipe Gestures

### useSwipeGesture Hook

The `useSwipeGesture` hook enables swipe detection:

```typescript
const swipeHandlers = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  minSwipeDistance: 50, // Minimum 50px swipe
});
```

### Recommended Use Cases

1. **Navigation**: Swipe between screens or tabs
2. **Dismissal**: Swipe to dismiss modals or cards
3. **Pagination**: Swipe through content lists

### Implementation Example

```typescript
<View {...swipeHandlers}>
  {/* Swipeable content */}
</View>
```

## Accessibility Considerations

### Touch Target Spacing

Maintain adequate spacing between interactive elements:
- Minimum 8px gap between touch targets
- Use `gap-2` (8px) or larger in flex/grid layouts

### Hit Slop

For small visual elements, extend the touch area:
```typescript
<Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
  {/* Small icon or element */}
</Pressable>
```

### Disabled States

Disabled elements should:
- Have `opacity-50` to indicate unavailability
- Not respond to touch events
- Maintain minimum size for visual consistency

## Testing Guidelines

### Manual Testing

Test on actual devices:
1. **iOS Devices**: iPhone SE (small), iPhone 14 (medium), iPhone 14 Pro Max (large)
2. **Android Devices**: Various screen sizes and manufacturers
3. **Tablets**: iPad, Android tablets

### Touch Target Verification

Use browser dev tools:
1. Enable touch simulation
2. Verify 44x44px minimum for all interactive elements
3. Test with "Show paint rectangles" to verify hit areas

### Gesture Testing

1. Test swipe gestures in all directions
2. Verify minimum swipe distance (50px default)
3. Test gesture conflicts (e.g., swipe vs scroll)

## Component Reference

### Components with Touch Optimization

1. **Button** (`src/components/ui/Button.tsx`)
   - All sizes meet 44px minimum
   - Scale feedback on press
   - Proper disabled states

2. **TouchableCard** (`src/components/ui/TouchableCard.tsx`)
   - Dedicated touchable card component
   - Built-in feedback animations
   - Minimum 44px height

3. **CategoryCard** (`src/components/CategoryCard.tsx`)
   - Full card pressable area
   - Scale feedback
   - 140px minimum height

4. **QuestionCard** (`src/components/QuestionCard.tsx`)
   - Answer options: 44px minimum
   - Clear pressed states
   - Proper spacing between options

## Best Practices

### DO

✅ Use minimum 44x44px for all interactive elements
✅ Provide immediate visual feedback on touch
✅ Use consistent transition timing (150ms)
✅ Test on real devices
✅ Maintain adequate spacing between touch targets
✅ Use scale animations for tactile feedback

### DON'T

❌ Create touch targets smaller than 44x44px
❌ Use instant state changes without transitions
❌ Place interactive elements too close together
❌ Forget to test on actual touch devices
❌ Rely solely on hover states (not available on touch)
❌ Use complex gestures without fallback interactions

## Future Enhancements

### Planned Improvements

1. **Haptic Feedback**: Add vibration feedback for key interactions
2. **Long Press**: Implement long-press gestures for contextual actions
3. **Multi-touch**: Support pinch-to-zoom for images
4. **Gesture Conflicts**: Better handling of scroll vs swipe conflicts

### Performance Optimization

1. Use `shouldRasterizeIOS` for complex animations
2. Optimize re-renders during touch interactions
3. Debounce rapid touch events where appropriate
