import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { SessionResult } from '@trivia-nft/shared';
import { SessionStatus } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';

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
  const { isMobile, isTablet } = useResponsive();
  
  const isPerfect = result.isPerfect;
  const hasEligibility = !!result.eligibilityId;
  const correctCount = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  const isWin = result.status === SessionStatus.WON;
  
  // Responsive text sizing
  const emojiSize = isMobile ? 'text-3xl' : 'text-4xl';
  const titleSize = isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl';
  const scoreSize = isMobile ? 'text-4xl' : 'text-5xl';
  const messageSize = isMobile ? 'text-base' : 'text-xl';
  const labelSize = isMobile ? 'text-xs' : 'text-sm';
  
  // Responsive spacing
  const cardMargin = isMobile ? 'mb-4' : 'mb-6';
  const sectionPadding = isMobile ? 'p-4' : 'p-6';

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
    <ScrollView className="flex-1 bg-background w-full">
      <Container maxWidth="md" className={`pt-24 pb-6 ${sectionPadding}`}>
        {/* Header - responsive sizing */}
        <View className={`items-center ${cardMargin}`}>
          <Text className={`mb-3 ${emojiSize}`}>
            {isPerfect ? '🎉' : isWin ? '✓' : '😔'}
          </Text>
          <Text className={`font-bold text-text-primary mb-2 ${titleSize}`}>
            {isPerfect ? 'Flawless!' : isWin ? 'Well Done!' : 'Better Luck Next Time'}
          </Text>
          <Text className={`text-text-secondary text-center ${labelSize}`}>
            {categoryName}
          </Text>
        </View>

        {/* Perfect Score Message */}
        {isPerfect && hasEligibility && (
          <Card variant="elevated" className={`${cardMargin} border-2 border-success-500`}>
            <View className="items-center">
              <Text className={`text-success-500 font-bold mb-2 text-center ${messageSize}`}>
                You've unlocked a {categoryName} mint!
              </Text>
              <Text className={`text-text-secondary text-center mb-4 ${labelSize}`}>
                Claim within 10 minutes to mint your NFT
              </Text>
              {onMintNow && (
                <Button
                  variant="primary"
                  size={isMobile ? 'md' : 'lg'}
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
          <Card variant="outlined" className={`${cardMargin} border-warning-500`}>
            <View className="items-center">
              <Text className={`text-warning-500 font-semibold mb-2 text-center ${isMobile ? 'text-base' : 'text-lg'}`}>
                Perfect Score!
              </Text>
              <Text className={`text-text-secondary text-center ${labelSize}`}>
                Unfortunately, you already have an active eligibility for this category or NFTs are out of stock.
              </Text>
            </View>
          </Card>
        )}

        {/* Score Card - responsive layout */}
        <Card variant="elevated" className={cardMargin}>
          <View className="items-center">
            <Text className={`text-text-secondary mb-2 ${labelSize}`}>
              Final Score
            </Text>
            <Text className={`font-bold text-text-primary mb-4 ${scoreSize}`}>
              {result.score}/{result.totalQuestions}
            </Text>

            {/* Score Breakdown - responsive sizing */}
            <View className={`w-full justify-center ${isMobile ? 'flex-row gap-3' : 'flex-row gap-4'}`}>
              <View className="items-center">
                <Badge variant="success" size={isMobile ? 'md' : 'lg'}>
                  {correctCount}
                </Badge>
                <Text className={`text-text-secondary mt-1 ${labelSize}`}>
                  Correct
                </Text>
              </View>
              <View className="items-center">
                <Badge variant="error" size={isMobile ? 'md' : 'lg'}>
                  {incorrectCount}
                </Badge>
                <Text className={`text-text-secondary mt-1 ${labelSize}`}>
                  Incorrect
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Statistics Card - responsive layout */}
        <Card variant="default" className={cardMargin}>
          <Text className={`text-text-primary font-semibold mb-3 ${isMobile ? 'text-base' : 'text-lg'}`}>
            Session Statistics
          </Text>

          <View className={isMobile ? 'gap-2' : 'gap-3'}>
            {/* Total Time */}
            <View className="flex-row justify-between items-center">
              <Text className={`text-text-secondary ${labelSize}`}>Total Time</Text>
              <Text className={`text-text-primary font-semibold ${labelSize}`}>
                {formatTime(result.totalMs)}
              </Text>
            </View>

            {/* Average Time per Question */}
            <View className="flex-row justify-between items-center">
              <Text className={`text-text-secondary ${labelSize}`}>Avg. per Question</Text>
              <Text className={`text-text-primary font-semibold ${labelSize}`}>
                {formatTime(result.totalMs / result.totalQuestions)}
              </Text>
            </View>

            {/* Status */}
            <View className="flex-row justify-between items-center">
              <Text className={`text-text-secondary ${labelSize}`}>Status</Text>
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
                <Text className={`text-text-secondary ${labelSize}`}>Achievement</Text>
                <Badge variant="primary" size="sm">
                  Perfect Score
                </Badge>
              </View>
            )}
          </View>
        </Card>

        {/* Action Buttons - responsive sizing and touch-friendly */}
        <View className={isMobile ? 'gap-2' : 'gap-3'}>
          {onPlayAgain && (
            <Button
              variant="primary"
              size={isMobile ? 'md' : 'lg'}
              fullWidth
              onPress={onPlayAgain}
            >
              Play Again
            </Button>
          )}
          {onBackToCategories && (
            <Button
              variant="outline"
              size={isMobile ? 'md' : 'lg'}
              fullWidth
              onPress={onBackToCategories}
            >
              Back to Categories
            </Button>
          )}
        </View>

        {/* Encouragement Message - responsive sizing */}
        {!isPerfect && (
          <View className={isMobile ? 'mt-4' : 'mt-6'}>
            <Text className={`text-text-secondary text-center ${labelSize}`}>
              {isWin
                ? 'Great job! Try for a perfect score next time to earn a mint eligibility.'
                : 'Keep practicing! You need 6 or more correct answers to win.'}
            </Text>
          </View>
        )}
      </Container>
    </ScrollView>
  );
};
