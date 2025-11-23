# Responsive Design Guide

This guide documents the responsive design system used in the TriviaNFT web application, including utilities, components, and patterns for building responsive layouts.

## Table of Contents

- [Overview](#overview)
- [Breakpoints](#breakpoints)
- [Hooks](#hooks)
  - [useResponsive](#useresponsive)
  - [useMediaQuery](#usemediaquery)
- [Components](#components)
  - [Container](#container)
  - [Grid](#grid)
  - [Stack](#stack)
- [Responsive Patterns](#responsive-patterns)
- [Best Practices](#best-practices)

## Overview

The responsive design system follows a **mobile-first** approach, where base styles target mobile devices and are progressively enhanced for larger screens. The system is built on:

- **React Native Web**: Cross-platform UI framework
- **NativeWind/Tailwind CSS**: Utility-first styling
- **Custom Hooks**: Responsive utilities for conditional rendering
- **Responsive Components**: Pre-built layout components

## Breakpoints

The application uses the following breakpoints:

| Breakpoint | Min Width | Device Category | Description |
|------------|-----------|-----------------|-------------|
| `sm` | 375px | Mobile (portrait) | Minimum mobile size |
| `md` | 768px | Tablet (portrait) | Tablet and large phones |
| `lg` | 1024px | Tablet (landscape) / Desktop | Small desktop screens |
| `xl` | 1280px | Desktop | Standard desktop |
| `2xl` | 1536px | Large Desktop | Large desktop screens |

### Device Categories

- **Mobile**: width < 768px
- **Tablet**: 768px ≤ width < 1024px
- **Desktop**: width ≥ 1024px

## Hooks

### useResponsive

The primary hook for accessing screen size information and responsive utilities.

#### Import

```typescript
import { useResponsive } from '@/hooks/useResponsive';
```

#### Usage

```typescript
const MyComponent = () => {
  const { 
    width, 
    height, 
    isMobile, 
    isTablet, 
    isDesktop,
    breakpoint,
    orientation,
    isSmallMobile,
    isTouchDevice
  } = useResponsive();

  return (
    <View>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </View>
  );
};
```

#### Return Value

```typescript
interface ScreenSize {
  width: number;              // Current viewport width in pixels
  height: number;             // Current viewport height in pixels
  isMobile: boolean;          // true if width < 768px
  isTablet: boolean;          // true if 768px ≤ width < 1024px
  isDesktop: boolean;         // true if width ≥ 1024px
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl';  // Current breakpoint
  orientation: 'portrait' | 'landscape';          // Screen orientation
  isSmallMobile: boolean;     // true if width < 375px
  isTouchDevice: boolean;     // true if device supports touch
}
```

#### Examples

**Conditional Rendering**

```typescript
const Navigation = () => {
  const { isMobile } = useResponsive();
  
  return isMobile ? <MobileNav /> : <DesktopNav />;
};
```

**Responsive Styling**

```typescript
const Card = () => {
  const { isDesktop } = useResponsive();
  
  return (
    <View className={`
      p-4 
      ${isDesktop ? 'hover:shadow-lg' : ''}
    `}>
      {/* Card content */}
    </View>
  );
};
```

**Touch Device Detection**

```typescript
const InteractiveElement = () => {
  const { isTouchDevice } = useResponsive();
  
  return (
    <Pressable
      className={`
        ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[32px] min-w-[32px]'}
      `}
    >
      {/* Content */}
    </Pressable>
  );
};
```

### useMediaQuery

A simpler hook for checking if the screen matches a specific breakpoint or larger.

#### Import

```typescript
import { useMediaQuery } from '@/hooks/useResponsive';
```

#### Usage

```typescript
const MyComponent = () => {
  const isLargeScreen = useMediaQuery('lg');
  
  return (
    <View>
      {isLargeScreen ? (
        <MultiColumnLayout />
      ) : (
        <SingleColumnLayout />
      )}
    </View>
  );
};
```

#### Parameters

- `minWidth`: `'sm' | 'md' | 'lg' | 'xl' | '2xl'` - The minimum breakpoint to match

#### Return Value

- `boolean` - `true` if the current screen width is greater than or equal to the specified breakpoint

## Components

### Container

A responsive container component that provides consistent padding and max-width constraints across different screen sizes.

#### Import

```typescript
import { Container } from '@/components/ui';
```

#### Props

```typescript
interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';  // Default: 'xl'
  centered?: boolean;                              // Default: true
  padding?: 'none' | 'sm' | 'md' | 'lg';          // Optional
  responsive?: boolean;                            // Default: true
}
```

#### Usage

**Basic Container**

```typescript
<Container>
  <Text>This content is centered with responsive padding</Text>
</Container>
```

**Custom Max Width**

```typescript
<Container maxWidth="md">
  <Text>This content has a medium max-width</Text>
</Container>
```

**Custom Padding**

```typescript
<Container padding="lg">
  <Text>This content has large padding</Text>
</Container>
```

**No Padding**

```typescript
<Container padding="none">
  <Text>This content has no padding</Text>
</Container>
```

#### Padding Scale

| Value | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| `sm` | 8px | 12px | 12px |
| `md` | 16px | 24px | 24px |
| `lg` | 24px | 32px | 48px |
| Default | 16px | 24px | 32px |

### Grid

A responsive grid component that adapts column count based on screen size.

#### Import

```typescript
import { Grid } from '@/components/ui';
```

#### Props

```typescript
interface GridProps extends ViewProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;    // Columns on mobile
    md?: number;    // Columns on tablet
    lg?: number;    // Columns on desktop
    xl?: number;    // Columns on large desktop
  };
  gap?: number | string;  // Gap between items (default: 4)
}
```

#### Usage

**Basic Grid**

```typescript
<Grid>
  <Card />
  <Card />
  <Card />
  <Card />
</Grid>
```

This creates a grid with:
- 1 column on mobile
- 2 columns on tablet
- 3 columns on desktop
- 4 columns on large desktop

**Custom Column Configuration**

```typescript
<Grid columns={{ sm: 1, md: 2, lg: 4 }}>
  <Card />
  <Card />
  <Card />
  <Card />
</Grid>
```

**Custom Gap**

```typescript
<Grid gap={8}>
  <Card />
  <Card />
</Grid>
```

**String Gap (Tailwind Class)**

```typescript
<Grid gap="gap-6">
  <Card />
  <Card />
</Grid>
```

#### Examples

**NFT Gallery**

```typescript
const NFTGallery = ({ nfts }) => (
  <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
    {nfts.map(nft => (
      <NFTCard key={nft.id} nft={nft} />
    ))}
  </Grid>
);
```

**Category Selection**

```typescript
const CategorySelection = ({ categories }) => (
  <Grid columns={{ sm: 2, md: 3, lg: 4 }} gap={4}>
    {categories.map(category => (
      <CategoryCard key={category.id} category={category} />
    ))}
  </Grid>
);
```

### Stack

A flexible stack component for arranging children in rows or columns with responsive direction changes.

#### Import

```typescript
import { Stack } from '@/components/ui';
```

#### Props

```typescript
interface StackProps extends ViewProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';                    // Default: 'column'
  spacing?: number;                                // Default: 4
  align?: 'start' | 'center' | 'end' | 'stretch'; // Default: 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'; // Default: 'start'
  wrap?: boolean;                                  // Default: false
  responsive?: {
    sm?: 'row' | 'column';
    md?: 'row' | 'column';
    lg?: 'row' | 'column';
  };
}
```

#### Usage

**Vertical Stack**

```typescript
<Stack spacing={4}>
  <Text>Item 1</Text>
  <Text>Item 2</Text>
  <Text>Item 3</Text>
</Stack>
```

**Horizontal Stack**

```typescript
<Stack direction="row" spacing={2}>
  <Button>Cancel</Button>
  <Button>Submit</Button>
</Stack>
```

**Centered Stack**

```typescript
<Stack align="center" justify="center">
  <Icon />
  <Text>Centered Content</Text>
</Stack>
```

**Responsive Direction**

```typescript
<Stack 
  direction="column"
  responsive={{ md: 'row', lg: 'row' }}
  spacing={4}
>
  <View>Left Content</View>
  <View>Right Content</View>
</Stack>
```

This creates a stack that:
- Displays vertically on mobile
- Displays horizontally on tablet and desktop

**Space Between**

```typescript
<Stack direction="row" justify="between">
  <Text>Left</Text>
  <Text>Right</Text>
</Stack>
```

#### Examples

**Form Actions**

```typescript
const FormActions = () => (
  <Stack 
    direction="row" 
    justify="end" 
    spacing={3}
    responsive={{ sm: 'column', md: 'row' }}
  >
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Submit</Button>
  </Stack>
);
```

**Profile Header**

```typescript
const ProfileHeader = () => (
  <Stack 
    direction="column"
    responsive={{ md: 'row' }}
    align="center"
    spacing={6}
  >
    <Avatar />
    <Stack spacing={2}>
      <Text>Username</Text>
      <Text>Bio</Text>
    </Stack>
  </Stack>
);
```

## Responsive Patterns

### Pattern 1: Mobile-First Styling

Always start with mobile styles and progressively enhance for larger screens.

```typescript
<View className="
  p-4           /* Mobile padding */
  md:p-6        /* Tablet padding */
  lg:p-8        /* Desktop padding */
">
  {/* Content */}
</View>
```

### Pattern 2: Conditional Rendering

Use `useResponsive` for different layouts on different devices.

```typescript
const MyComponent = () => {
  const { isMobile, isDesktop } = useResponsive();
  
  return (
    <>
      {isMobile && <MobileView />}
      {isDesktop && <DesktopView />}
    </>
  );
};
```

### Pattern 3: Responsive Grids

Use the Grid component for responsive card layouts.

```typescript
<Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
  {items.map(item => <Card key={item.id} {...item} />)}
</Grid>
```

### Pattern 4: Touch-Friendly Targets

Ensure interactive elements meet minimum size requirements on touch devices.

```typescript
const Button = () => {
  const { isTouchDevice } = useResponsive();
  
  return (
    <Pressable className={`
      ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[32px]'}
      px-4 py-2
    `}>
      <Text>Click Me</Text>
    </Pressable>
  );
};
```

### Pattern 5: Responsive Typography

Adjust text sizes for different screen sizes.

```typescript
<Text className="
  text-2xl      /* Mobile */
  md:text-3xl   /* Tablet */
  lg:text-4xl   /* Desktop */
">
  Heading
</Text>
```

### Pattern 6: Responsive Images

Use appropriate image sizes for different viewports.

```typescript
<OptimizedImage
  source={imageSource}
  className="
    w-full
    h-48        /* Mobile */
    md:h-64     /* Tablet */
    lg:h-80     /* Desktop */
  "
  resizeMode="cover"
/>
```

### Pattern 7: Responsive Navigation

Adapt navigation for different screen sizes.

```typescript
const Navigation = () => {
  const { isMobile } = useResponsive();
  
  return isMobile ? (
    <MobileNav /> // Hamburger menu
  ) : (
    <DesktopNav /> // Full navigation bar
  );
};
```

### Pattern 8: Responsive Modals

Ensure modals fit within the viewport.

```typescript
const Modal = ({ children }) => {
  const { isMobile } = useResponsive();
  
  return (
    <View className={`
      ${isMobile ? 'w-full h-full' : 'max-w-lg max-h-[90vh]'}
      bg-white rounded-lg
    `}>
      {children}
    </View>
  );
};
```

## Best Practices

### 1. Use Mobile-First Approach

Always design for mobile first, then enhance for larger screens.

```typescript
// ✅ Good
<View className="p-4 md:p-6 lg:p-8">

// ❌ Bad
<View className="lg:p-8 md:p-6 p-4">
```

### 2. Maintain Touch Target Sizes

Ensure interactive elements are at least 44×44px on touch devices.

```typescript
const { isTouchDevice } = useResponsive();

<Pressable className={`
  ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : ''}
`}>
```

### 3. Use Semantic Breakpoints

Choose breakpoints based on content needs, not specific devices.

```typescript
// ✅ Good - Based on layout needs
const { isDesktop } = useResponsive();
if (isDesktop) {
  // Show multi-column layout
}

// ❌ Bad - Device-specific
if (width === 768) {
  // iPad-specific code
}
```

### 4. Test on Real Devices

Always test responsive layouts on actual mobile devices and tablets, not just browser DevTools.

### 5. Avoid Horizontal Scrolling

Ensure content never requires horizontal scrolling.

```typescript
<View className="w-full overflow-hidden">
  {/* Content */}
</View>
```

### 6. Use Responsive Components

Leverage pre-built responsive components instead of custom solutions.

```typescript
// ✅ Good
<Grid columns={{ sm: 1, md: 2, lg: 3 }}>
  {items.map(item => <Card key={item.id} />)}
</Grid>

// ❌ Bad - Custom responsive logic
const columns = isMobile ? 1 : isTablet ? 2 : 3;
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  {/* Manual column calculation */}
</View>
```

### 7. Optimize Images

Use appropriate image sizes for different viewports to improve performance.

```typescript
<OptimizedImage
  source={imageSource}
  sizes={{ sm: 400, md: 600, lg: 800 }}
/>
```

### 8. Preserve State on Resize

Ensure user state is maintained when screen size changes.

```typescript
import { useStatePreservation } from '@/hooks/useStatePreservation';

const MyComponent = () => {
  const [value, setValue] = useStatePreservation('myKey', '');
  // State is preserved across screen size changes
};
```

### 9. Consider Orientation Changes

Handle both portrait and landscape orientations.

```typescript
const { orientation } = useResponsive();

<View className={`
  ${orientation === 'portrait' ? 'flex-col' : 'flex-row'}
`}>
```

### 10. Use Consistent Spacing

Use the spacing scale consistently across breakpoints.

```typescript
// ✅ Good - Consistent scale
<View className="gap-4 md:gap-6 lg:gap-8">

// ❌ Bad - Inconsistent values
<View className="gap-3 md:gap-7 lg:gap-11">
```

## Additional Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [React Native Web Documentation](https://necolas.github.io/react-native-web/)
- [WCAG 2.1 Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile-First Design Principles](https://www.nngroup.com/articles/mobile-first-not-mobile-only/)

---

**Last Updated**: November 22, 2025
