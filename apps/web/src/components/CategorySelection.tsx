import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import type { Category } from '@trivia-nft/shared';
import { categoryService, sessionService } from '../services';
import { CategoryCard } from './CategoryCard';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';
import { useCountdown } from '../hooks/useCountdown';

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

  const resetCountdown = useCountdown(sessionLimits?.resetAt || '');

  useEffect(() => {
    loadData();
  }, []);

  // Refresh session limits when countdown expires (daily reset)
  useEffect(() => {
    if (resetCountdown.isExpired && sessionLimits) {
      console.log('[CategorySelection] Session limit reset detected, refreshing limits...');
      loadData();
    }
  }, [resetCountdown.isExpired]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[CategorySelection] Loading data...');
      
      const [categoriesRes, limitsRes] = await Promise.all([
        categoryService.getCategories(),
        sessionService.getSessionLimits(),
      ]);

      console.log('[CategorySelection] Categories response:', categoriesRes);
      console.log('[CategorySelection] Limits response:', limitsRes);

      if (!categoriesRes || !categoriesRes.categories) {
        throw new Error('Invalid categories response');
      }

      if (!limitsRes || typeof limitsRes.remainingSessions === 'undefined') {
        throw new Error('Invalid session limits response');
      }

      setCategories(categoriesRes.categories);
      setSessionLimits({
        remainingSessions: limitsRes.remainingSessions,
        resetAt: limitsRes.resetAt || new Date(Date.now() + 86400000).toISOString(),
        cooldownEndsAt: limitsRes.cooldownEndsAt,
      });
      
      console.log('[CategorySelection] Data loaded successfully');
    } catch (err) {
      console.error('[CategorySelection] Failed to load categories:', err);
      console.error('[CategorySelection] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(`Failed to load categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  // MUST call all hooks before any conditional returns
  const { isMobile, isTablet } = useResponsive();

  const cooldownSeconds = getCooldownTime();
  const isOnCooldown = cooldownSeconds !== null && cooldownSeconds > 0;
  const hasSessionsRemaining = sessionLimits && sessionLimits.remainingSessions > 0;

  // Responsive text sizing
  const headerTextSize = isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl';
  const subheaderTextSize = isMobile ? 'text-sm' : 'text-base';
  
  // Responsive grid columns
  const gridClasses = isMobile 
    ? 'gap-3' 
    : isTablet 
    ? 'gap-4 grid grid-cols-2' 
    : 'gap-4 grid grid-cols-3';

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

  return (
    <View className="flex-1 bg-background w-full">
      <ScrollView className="flex-1">
        <Container maxWidth="lg" className="pt-24 pb-6">
          {/* Header - responsive sizing */}
          <View className="mb-4 sm:mb-6">
            <Text className={`font-bold text-text-primary mb-2 ${headerTextSize}`}>
              Select a Category
            </Text>
            <Text className={`text-text-secondary ${subheaderTextSize}`}>
              Choose a trivia category to start your session
            </Text>
          </View>

        {/* Session Limits Card - responsive layout */}
        {sessionLimits && (
          <Card variant="outlined" className="mb-4 sm:mb-6">
            <View className={`items-center ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between'}`}>
              <View className={isMobile ? 'items-center' : ''}>
                <Text className={`text-text-secondary mb-1 ${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                  Sessions Remaining
                </Text>
                <Text className={`font-bold text-text-primary ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                  {sessionLimits.remainingSessions}
                </Text>
              </View>
              <View className={`items-${isMobile ? 'center' : 'end'}`}>
                <Text className={`text-text-secondary mb-1 ${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                  Resets in
                </Text>
                <Badge variant="primary" size={isMobile ? 'sm' : 'md'}>
                  {getTimeUntilReset()}
                </Badge>
              </View>
            </View>

            {/* Cooldown Warning */}
            {isOnCooldown && (
              <View className="mt-4 pt-4 border-t border-background-tertiary">
                <Text className={`text-warning-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  ⏱️ Cooldown active: {cooldownSeconds}s remaining
                </Text>
              </View>
            )}

            {/* No Sessions Warning */}
            {!hasSessionsRemaining && (
              <View className="mt-4 pt-4 border-t border-background-tertiary">
                <Text className={`text-error-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  ⚠️ Daily limit reached. Come back after reset!
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Categories Grid - responsive columns */}
        <View className={gridClasses} style={{ width: '100%' }}>
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
