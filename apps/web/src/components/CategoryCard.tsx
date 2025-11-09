import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Category } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

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
  const isOutOfStock = category.stockAvailable === 0;
  const isDisabled = disabled || !category.isActive;

  return (
    <Pressable
      onPress={() => !isDisabled && onSelect(category.id)}
      disabled={isDisabled}
      className={`${isDisabled ? 'opacity-50' : 'active:opacity-80 active:scale-[0.98]'} transition-all duration-150`}
    >
      <Card variant="elevated" className="min-h-[140px] min-w-[44px]">
        <View className="flex-1 justify-between">
          {/* Category Icon/Name */}
          <View className="mb-3">
            <Text className="text-xl font-bold text-text-primary mb-1">
              {category.name}
            </Text>
            {category.description && (
              <Text className="text-sm text-text-secondary" numberOfLines={2}>
                {category.description}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {/* NFT Count Badge */}
              {category.nftCount !== undefined && (
                <Badge variant="secondary" size="sm">
                  {category.nftCount} NFTs
                </Badge>
              )}

              {/* Stock Status Badge */}
              {isOutOfStock ? (
                <Badge variant="error" size="sm">
                  Out of Stock
                </Badge>
              ) : category.stockAvailable !== undefined ? (
                <Badge variant="success" size="sm">
                  {category.stockAvailable} Available
                </Badge>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
