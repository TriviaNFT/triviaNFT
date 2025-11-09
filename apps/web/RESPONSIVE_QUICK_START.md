# Responsive Design Quick Start Guide

## Quick Reference

### Breakpoints

```typescript
sm: 375px   // Mobile portrait
md: 768px   // Tablet portrait
lg: 1024px  // Tablet landscape / Small desktop
xl: 1280px  // Desktop
2xl: 1536px // Large desktop
```

### Common Patterns

#### 1. Responsive Container

```tsx
import { Container } from '../components/ui/Container';

<Container maxWidth="lg">
  {/* Your content */}
</Container>
```

#### 2. Responsive Grid

```tsx
import { Grid } from '../components/ui/Grid';

<Grid cols={{ default: 1, md: 2, lg: 3 }} gap={4}>
  {items.map(item => <Card key={item.id} {...item} />)}
</Grid>
```

#### 3. Responsive Stack

```tsx
import { Stack } from '../components/ui/Stack';

<Stack 
  direction="column" 
  responsive={{ md: 'row' }}
  spacing={4}
>
  <View>Item 1</View>
  <View>Item 2</View>
</Stack>
```

#### 4. Conditional Rendering

```tsx
import { useResponsive } from '../hooks/useResponsive';

const { isMobile, isDesktop } = useResponsive();

return (
  <View>
    {isMobile && <MobileView />}
    {isDesktop && <DesktopView />}
  </View>
);
```

#### 5. Responsive Text

```tsx
<Text className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
  Heading
</Text>
```

### Touch Interactions

#### 1. Buttons (Automatic)

```tsx
import { Button } from '../components/ui/Button';

<Button size="md">
  Click Me
</Button>
// Automatically has 44px minimum touch target
```

#### 2. Touchable Cards

```tsx
import { TouchableCard } from '../components/ui/TouchableCard';

<TouchableCard onPress={handlePress}>
  <Text>Card Content</Text>
</TouchableCard>
```

#### 3. Swipe Gestures

```tsx
import { useSwipeGesture } from '../hooks/useSwipeGesture';

const swipeHandlers = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
});

<View {...swipeHandlers}>
  {/* Swipeable content */}
</View>
```

### Performance Optimization

#### 1. Lazy Loading

```tsx
import { lazy } from 'react';
import { LazyLoad } from '../components/LazyLoad';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<LazyLoad>
  <HeavyComponent />
</LazyLoad>
```

#### 2. Optimized Images

```tsx
import { OptimizedImage } from '../components/ui/OptimizedImage';

<OptimizedImage
  source={{ uri: imageUrl }}
  width={300}
  height={200}
/>
```

#### 3. Network Adaptation

```tsx
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const { isSlowConnection } = useNetworkStatus();

// Adapt behavior
const imageQuality = isSlowConnection ? 'low' : 'high';
```

#### 4. Virtual Lists

```tsx
import { VirtualList } from '../components/ui/VirtualList';

<VirtualList
  data={items}
  renderItem={(item) => <ItemCard item={item} />}
  itemHeight={100}
/>
```

### Tailwind Responsive Classes

```tsx
// Mobile-first approach
<View className="
  px-4          // 16px padding on mobile
  md:px-6       // 24px padding on tablet
  lg:px-8       // 32px padding on desktop
  
  grid-cols-1   // 1 column on mobile
  md:grid-cols-2 // 2 columns on tablet
  lg:grid-cols-3 // 3 columns on desktop
">
```

### Common Responsive Patterns

#### Full-width on mobile, constrained on desktop

```tsx
<View className="w-full max-w-screen-xl mx-auto px-4 md:px-6">
```

#### Stack vertically on mobile, horizontally on desktop

```tsx
<View className="flex flex-col md:flex-row gap-4">
```

#### Hide on mobile, show on desktop

```tsx
<View className="hidden md:block">
```

#### Show on mobile, hide on desktop

```tsx
<View className="block md:hidden">
```

### Testing Checklist

- [ ] Test on mobile (375px width minimum)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1280px width minimum)
- [ ] All touch targets ≥ 44x44px
- [ ] Touch feedback works
- [ ] Images load appropriately
- [ ] Performance is acceptable on 3G

### Resources

- Full Guide: `TOUCH_INTERACTION_GUIDE.md`
- Performance: `PERFORMANCE_OPTIMIZATION.md`
- Testing: `PERFORMANCE_TESTING.md`
- Summary: `TASK_26_SUMMARY.md`
