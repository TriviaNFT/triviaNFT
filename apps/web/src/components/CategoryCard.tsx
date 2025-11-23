import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Category } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { useFocusRing } from '../hooks/useFocusRing';

export interface CategoryCardProps {
  category: Category;
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onSelect,
  disabled = false,
}) => {
  const isDisabled = disabled || !category.isActive;
  const { isFocused, onFocus, onBlur, getFocusRingStyle } = useFocusRing();

  return (
    <Pressable
      onPress={() => !isDisabled && onSelect(category.id)}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`Select ${category.name} category`}
      className={`${isDisabled ? 'opacity-50' : 'active:opacity-80 active:scale-[0.98]'} transition-all duration-150`}
      style={getFocusRingStyle()}
    >
      <Card variant="elevated" className="min-h-[140px] min-w-[44px]">
        <View className="flex-1 justify-between">
          {/* Category Icon/Name */}
          <View className="mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              {/* Icon */}
              {category.iconUrl && (
                <Text className="text-2xl">{category.iconUrl}</Text>
              )}
              {/* Name */}
              <Text className="text-xl font-bold text-text-primary flex-1">
                {category.name}
              </Text>
            </View>
            {category.description && (
              <Text className="text-sm text-text-secondary" numberOfLines={2}>
                {category.description}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {/* NFT Mintable Badge - shows how many NFT designs are available */}
              {category.nftCount !== undefined && (
                <Badge 
                  variant={category.nftCount > 0 ? "success" : "secondary"} 
                  size="sm"
                >
                  {category.nftCount} Mintable
                </Badge>
              )}

              {/* Owned Badge - shows how many NFTs the player owns in this category */}
              {category.ownedCount !== undefined && (
                <Badge 
                  variant={category.ownedCount > 0 ? "primary" : "warning"} 
                  size="sm"
                >
                  {category.ownedCount} Owned
                </Badge>
              )}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
