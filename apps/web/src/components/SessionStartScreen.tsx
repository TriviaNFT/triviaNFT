import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';

export interface SessionStartScreenProps {
  categoryName: string;
  nftCount?: number; // Number of NFT designs available
  onStart: () => void;
}

export const SessionStartScreen: React.FC<SessionStartScreenProps> = ({
  categoryName,
  nftCount,
  onStart,
}) => {
  const [countdown, setCountdown] = useState(3);
  const [showRules, setShowRules] = useState(true);
  const { isMobile, isTablet } = useResponsive();

  // Countdown timer
  useEffect(() => {
    if (!showRules) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showRules]);

  // Call onStart when countdown reaches 0
  useEffect(() => {
    if (!showRules && countdown === 0) {
      onStart();
    }
  }, [countdown, showRules, onStart]);

  // Responsive sizing
  const countdownSize = isMobile ? 'text-5xl' : 'text-6xl';
  const readyTextSize = isMobile ? 'text-lg' : 'text-xl';
  const titleSize = isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl';
  const rulesTextSize = isMobile ? 'text-sm' : 'text-base';
  const infoTextSize = isMobile ? 'text-xs' : 'text-sm';
  const buttonSize = isMobile ? 'md' : 'lg';
  const padding = isMobile ? 'p-4' : 'p-6';

  if (!showRules) {
    return (
      <View className={`flex-1 items-center justify-center bg-background w-full ${padding}`}>
        <Text className={`font-bold text-primary-500 mb-4 ${countdownSize}`}>
          {countdown}
        </Text>
        <Text className={`text-text-secondary ${readyTextSize}`}>
          Get ready...
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 items-center justify-center bg-background w-full ${padding}`}>
      <Container maxWidth="md">
        <Card variant="elevated" className="w-full">
          <View className="items-center">
            {/* Category Name - responsive sizing */}
            <Text className={`font-bold text-text-primary mb-4 sm:mb-6 text-center ${titleSize}`}>
              {categoryName}
            </Text>

            {/* Rules Message - responsive sizing */}
            <View className={`bg-background-tertiary rounded-lg mb-4 sm:mb-6 w-full ${isMobile ? 'p-3' : 'p-4'}`}>
              <Text className={`text-text-primary text-center leading-6 ${rulesTextSize}`}>
                10 questions • 10s each • no pauses • perfect = mint chance
              </Text>
            </View>

            {/* NFT Info - responsive sizing */}
            {nftCount !== undefined && (
              <View className="mb-4 sm:mb-6">
                {nftCount > 0 ? (
                  <Text className={`text-success-500 text-center ${infoTextSize}`}>
                    ✓ {nftCount} NFT design{nftCount !== 1 ? 's' : ''} available for perfect scores
                  </Text>
                ) : (
                  <Text className={`text-warning-500 text-center ${infoTextSize}`}>
                    ⚠️ No NFT designs currently available for this category
                  </Text>
                )}
              </View>
            )}

            {/* Start Button - responsive sizing and touch-friendly */}
            <Button
              variant="primary"
              size={buttonSize}
              fullWidth
              onPress={() => setShowRules(false)}
            >
              Start Session
            </Button>

            {/* Additional Info - responsive sizing */}
            <Text className={`text-text-secondary text-center mt-3 sm:mt-4 ${infoTextSize}`}>
              Answer all 10 questions correctly to earn a mint eligibility
            </Text>
          </View>
        </Card>
      </Container>
    </View>
  );
};
