import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import type { Category } from '@trivia-nft/shared';
import { categoryService, sessionService } from '../services';
import { CategoryCard } from './CategoryCard';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';

export interface CategorySelectionProps {
  onCategorySelect: (categoryId: string) => void;
}

export const CategorySelection: React.FC<CategorySelectionProps> = ({
  onCategorySelect,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessionLimits, setSessionLimits] = useState<{
    remainingSessions: number;
    resetAt: string;
    cooldownEndsAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesRes, limitsRes] = await Promise.all([
        categoryService.getCategories(),
        sessionService.getSessionLimits(),
      ]);

      setCategories(categoriesRes.categories);
      setSessionLimits({
        remainingSessions: limitsRes.remainingSessions,
        resetAt: limitsRes.resetAt,
        cooldownEndsAt: limitsRes.cooldownEndsAt,
      });
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilReset = () => {
    if (!sessionLimits) return '';
    
    const resetTime = new Date(sessionLimits.resetAt).getTime();
    const now = Date.now();
    const diff = resetTime - now;

    if (diff <= 0) return 'Resetting...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getCooldownTime = () => {
    if (!sessionLimits?.cooldownEndsAt) return null;

    const cooldownEnd = new Date(sessionLimits.cooldownEndsAt).getTime();
    const now = Date.now();
    const diff = cooldownEnd - now;

    if (diff <= 0) return null;

    const seconds = Math.ceil(diff / 1000);
    return seconds;
  };

  const cooldownSeconds = getCooldownTime();
  const isOnCooldown = cooldownSeconds !== null && cooldownSeconds > 0;
  const hasSessionsRemaining = sessionLimits && sessionLimits.remainingSessions > 0;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className="text-text-secondary mt-4">Loading categories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-error-500 text-center mb-4">{error}</Text>
        <Text
          className="text-primary-500 font-semibold"
          onPress={loadData}
        >
          Retry
        </Text>
      </View>
    );
  }

  const { isMobile } = useResponsive();

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <Container maxWidth="lg" className="py-6">
          {/* Header */}
          <View className="mb-6">
            <Text className={`font-bold text-text-primary mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Select a Category
            </Text>
            <Text className={`text-text-secondary ${isMobile ? 'text-sm' : 'text-base'}`}>
              Choose a trivia category to start your session
            </Text>
          </View>

        {/* Session Limits Card */}
        {sessionLimits && (
          <Card variant="outlined" className="mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-text-secondary text-sm mb-1">
                  Sessions Remaining
                </Text>
                <Text className="text-2xl font-bold text-text-primary">
                  {sessionLimits.remainingSessions}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-text-secondary text-sm mb-1">
                  Resets in
                </Text>
                <Badge variant="primary" size="md">
                  {getTimeUntilReset()}
                </Badge>
              </View>
            </View>

            {/* Cooldown Warning */}
            {isOnCooldown && (
              <View className="mt-4 pt-4 border-t border-background-tertiary">
                <Text className="text-warning-500 text-sm">
                  ⏱️ Cooldown active: {cooldownSeconds}s remaining
                </Text>
              </View>
            )}

            {/* No Sessions Warning */}
            {!hasSessionsRemaining && (
              <View className="mt-4 pt-4 border-t border-background-tertiary">
                <Text className="text-error-500 text-sm">
                  ⚠️ Daily limit reached. Come back after reset!
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Categories Grid */}
        <View className="gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onSelect={onCategorySelect}
              disabled={isOnCooldown || !hasSessionsRemaining}
            />
          ))}
        </View>

        {categories.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-text-secondary text-center">
              No categories available at the moment
            </Text>
          </View>
        )}
        </Container>
      </ScrollView>
    </View>
  );
};
