import React, { useState, useRef, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';

export interface VirtualListProps<T> extends Omit<ScrollViewProps, 'children'> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  keyExtractor?: (item: T, index: number) => string;
}

/**
 * Virtual list component for rendering large lists efficiently.
 * Only renders items that are visible in the viewport plus overscan.
 */
export function VirtualList<T>({
  data,
  renderItem,
  itemHeight,
  overscan = 3,
  keyExtractor = (_, index) => String(index),
  ...scrollViewProps
}: VirtualListProps<T>) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const totalHeight = data.length * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
  const endIndex = Math.min(
    data.length - 1,
    Math.ceil((scrollOffset + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = data.slice(startIndex, endIndex + 1);

  const handleScroll = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    setScrollOffset(offset);
  }, []);

  const handleLayout = useCallback((event: any) => {
    const height = event.nativeEvent.layout.height;
    setContainerHeight(height);
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={handleScroll}
      onLayout={handleLayout}
      scrollEventThrottle={16}
      {...scrollViewProps}
    >
      <View style={{ height: totalHeight }}>
        <View style={{ transform: [{ translateY: startIndex * itemHeight }] }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <View
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
