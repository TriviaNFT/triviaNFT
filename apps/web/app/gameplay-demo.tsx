import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SessionProvider } from '../src/contexts/SessionContext';
import { CategorySelection } from '../src/components/CategorySelection';
import { SessionFlow } from '../src/components/SessionFlow';
import { SessionResults } from '../src/components/SessionResults';
import { ActiveSessionGuard } from '../src/components/ActiveSessionGuard';
import type { SessionResult } from '@trivia-nft/shared';

type GameplayState = 'categories' | 'session' | 'results';

export default function GameplayDemo() {
  const [state, setState] = useState<GameplayState>('categories');
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    stockAvailable?: number;
  } | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const handleCategorySelect = (categoryId: string) => {
    // In a real app, you'd fetch the category details
    setSelectedCategory({
      id: categoryId,
      name: 'Science', // This would come from the category data
      stockAvailable: 10,
    });
    setState('session');
  };

  const handleSessionComplete = (result: SessionResult) => {
    setSessionResult(result);
    setState('results');
  };

  const handleSessionError = (error: Error) => {
    console.error('Session error:', error);
    alert(`Session error: ${error.message}`);
    setState('categories');
  };

  const handlePlayAgain = () => {
    setState('categories');
    setSelectedCategory(null);
    setSessionResult(null);
  };

  const handleBackToCategories = () => {
    setState('categories');
    setSelectedCategory(null);
    setSessionResult(null);
  };

  const handleMintNow = () => {
    // Navigate to mint screen
    alert('Navigate to mint screen');
  };

  return (
    <SessionProvider>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="bg-background-secondary border-b border-background-tertiary p-4">
          <Text className="text-2xl font-bold text-text-primary">
            Gameplay Demo
          </Text>
          <Text className="text-text-secondary text-sm">
            Current State: {state}
          </Text>
        </View>

        {/* Content */}
        {state === 'categories' && (
          <ActiveSessionGuard>
            <CategorySelection onCategorySelect={handleCategorySelect} />
          </ActiveSessionGuard>
        )}

        {state === 'session' && selectedCategory && (
          <SessionFlow
            categoryId={selectedCategory.id}
            categoryName={selectedCategory.name}
            stockAvailable={selectedCategory.stockAvailable}
            onComplete={handleSessionComplete}
            onError={handleSessionError}
          />
        )}

        {state === 'results' && sessionResult && selectedCategory && (
          <SessionResults
            result={sessionResult}
            categoryName={selectedCategory.name}
            onMintNow={sessionResult.eligibilityId ? handleMintNow : undefined}
            onPlayAgain={handlePlayAgain}
            onBackToCategories={handleBackToCategories}
          />
        )}
      </View>
    </SessionProvider>
  );
}
