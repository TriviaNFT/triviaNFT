import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { SessionResult } from '@trivia-nft/shared';
import { SessionStatus } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export interface SessionResultsProps {
  result: SessionResult;
  categoryName: string;
  onMintNow?: () => void;
  onPlayAgain?: () => void;
  onBackToCategories?: () => void;
}

export const SessionResults: React.FC<SessionResultsProps> = ({
  result,
  categoryName,
  onMintNow,
  onPlayAgain,
  onBackToCategories,
}) => {
  const isPerfect = result.isPerfect;
  const hasEligibility = !!result.eligibilityId;
  const correctCount = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  const isWin = result.status === SessionStatus.WON;

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-4xl mb-3">
            {isPerfect ? '🎉' : isWin ? '✓' : '😔'}
          </Text>
          <Text className="text-3xl font-bold text-text-primary mb-2">
            {isPerfect ? 'Flawless!' : isWin ? 'Well Done!' : 'Better Luck Next Time'}
          </Text>
          <Text className="text-text-secondary text-center">
            {categoryName}
          </Text>
        </View>

        {/* Perfect Score Message */}
        {isPerfect && hasEligibility && (
          <Card variant="elevated" className="mb-6 border-2 border-success-500">
            <View className="items-center">
              <Text className="text-success-500 text-xl font-bold mb-2 text-center">
                You've unlocked a {categoryName} mint!
              </Text>
              <Text className="text-text-secondary text-sm text-center mb-4">
                Claim within 1 hour to mint your NFT
              </Text>
              {onMintNow && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={onMintNow}
                >
                  Mint Now
                </Button>
              )}
            </View>
          </Card>
        )}

        {/* Perfect Score but No Eligibility */}
        {isPerfect && !hasEligibility && (
          <Card variant="outlined" className="mb-6 border-warning-500">
            <View className="items-center">
              <Text className="text-warning-500 text-lg font-semibold mb-2 text-center">
                Perfect Score!
              </Text>
              <Text className="text-text-secondary text-sm text-center">
                Unfortunately, you already have an active eligibility for this category or NFTs are out of stock.
              </Text>
            </View>
          </Card>
        )}

        {/* Score Card */}
        <Card variant="elevated" className="mb-6">
          <View className="items-center">
            <Text className="text-text-secondary text-sm mb-2">
              Final Score
            </Text>
            <Text className="text-5xl font-bold text-text-primary mb-4">
              {result.score}/{result.totalQuestions}
            </Text>

            {/* Score Breakdown */}
            <View className="flex-row gap-4 w-full justify-center">
              <View className="items-center">
                <Badge variant="success" size="lg">
                  {correctCount}
                </Badge>
                <Text className="text-text-secondary text-xs mt-1">
                  Correct
                </Text>
              </View>
              <View className="items-center">
                <Badge variant="error" size="lg">
                  {incorrectCount}
                </Badge>
                <Text className="text-text-secondary text-xs mt-1">
                  Incorrect
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Statistics Card */}
        <Card variant="default" className="mb-6">
          <Text className="text-text-primary font-semibold mb-4">
            Session Statistics
          </Text>

          <View className="gap-3">
            {/* Total Time */}
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary">Total Time</Text>
              <Text className="text-text-primary font-semibold">
                {formatTime(result.totalMs)}
              </Text>
            </View>

            {/* Average Time per Question */}
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary">Avg. per Question</Text>
              <Text className="text-text-primary font-semibold">
                {formatTime(result.totalMs / result.totalQuestions)}
              </Text>
            </View>

            {/* Status */}
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary">Status</Text>
              <Badge
                variant={isWin ? 'success' : 'error'}
                size="sm"
              >
                {isWin ? 'Win' : 'Loss'}
              </Badge>
            </View>

            {/* Perfect Score Badge */}
            {isPerfect && (
              <View className="flex-row justify-between items-center">
                <Text className="text-text-secondary">Achievement</Text>
                <Badge variant="primary" size="sm">
                  Perfect Score
                </Badge>
              </View>
            )}
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="gap-3">
          {onPlayAgain && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={onPlayAgain}
            >
              Play Again
            </Button>
          )}
          {onBackToCategories && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={onBackToCategories}
            >
              Back to Categories
            </Button>
          )}
        </View>

        {/* Encouragement Message */}
        {!isPerfect && (
          <View className="mt-6">
            <Text className="text-text-secondary text-sm text-center">
              {isWin
                ? 'Great job! Try for a perfect score next time to earn a mint eligibility.'
                : 'Keep practicing! You need 6 or more correct answers to win.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
