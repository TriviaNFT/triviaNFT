import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export interface SessionStartScreenProps {
  categoryName: string;
  stockAvailable?: number;
  onStart: () => void;
}

export const SessionStartScreen: React.FC<SessionStartScreenProps> = ({
  categoryName,
  stockAvailable,
  onStart,
}) => {
  const [countdown, setCountdown] = useState(3);
  const [showRules, setShowRules] = useState(true);

  useEffect(() => {
    if (!showRules) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onStart();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showRules, onStart]);

  if (!showRules) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-6xl font-bold text-primary-500 mb-4">
          {countdown}
        </Text>
        <Text className="text-xl text-text-secondary">
          Get ready...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Card variant="elevated" className="w-full max-w-md">
        <View className="items-center">
          {/* Category Name */}
          <Text className="text-2xl font-bold text-text-primary mb-6 text-center">
            {categoryName}
          </Text>

          {/* Rules Message */}
          <View className="bg-background-tertiary rounded-lg p-4 mb-6 w-full">
            <Text className="text-text-primary text-center text-base leading-6">
              10 questions • 10s each • no pauses • perfect = mint chance
            </Text>
          </View>

          {/* Stock Info */}
          {stockAvailable !== undefined && (
            <View className="mb-6">
              {stockAvailable > 0 ? (
                <Text className="text-success-500 text-sm text-center">
                  ✓ {stockAvailable} NFTs available for perfect scores
                </Text>
              ) : (
                <Text className="text-warning-500 text-sm text-center">
                  ⚠️ No NFTs currently available for this category
                </Text>
              )}
            </View>
          )}

          {/* Start Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setShowRules(false)}
          >
            Start Session
          </Button>

          {/* Additional Info */}
          <Text className="text-text-secondary text-xs text-center mt-4">
            Answer all 10 questions correctly to earn a mint eligibility
          </Text>
        </View>
      </Card>
    </View>
  );
};
