import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';

export interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  isTimeout?: boolean;
  questionId?: string;
  onNext?: () => void;
  onReportQuestion?: (questionId: string, reason: string) => void;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({
  isCorrect,
  correctIndex,
  explanation,
  isTimeout = false,
  questionId,
  onNext,
  onReportQuestion,
}) => {
  const [isReporting, setIsReporting] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const handleReport = async () => {
    if (!questionId) return;

    setIsReporting(true);
    try {
      await onReportQuestion?.(questionId, 'Question flagged by user');
      alert('Thank you! Question has been flagged for review.');
    } catch (error) {
      alert('Failed to report question. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  // Responsive sizing
  const iconSize = isMobile ? 'text-5xl' : 'text-6xl';
  const titleSize = isMobile ? 'text-xl' : 'text-2xl';
  const labelSize = isMobile ? 'text-xs' : 'text-sm';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const padding = isMobile ? 'p-4' : 'p-6';
  const cardPadding = isMobile ? 'p-2' : 'p-3';
  const buttonSize = isMobile ? 'md' : 'lg';
  const marginBottom = isMobile ? 'mb-4' : 'mb-6';

  return (
    <View className={`flex-1 items-center justify-center bg-background w-full ${padding}`}>
      <Container maxWidth="md">
        <Card
          variant="elevated"
          className={`w-full ${
            isTimeout
              ? 'border-2 border-warning-500'
              : isCorrect
              ? 'border-2 border-success-500'
              : 'border-2 border-error-500'
          }`}
        >
          {/* Result Icon and Message - responsive sizing */}
          <View className={`items-center ${marginBottom}`}>
            <Text className={`mb-3 ${iconSize}`}>
              {isTimeout ? '⏱️' : isCorrect ? '✓' : '✗'}
            </Text>
            <Text
              className={`font-bold ${titleSize} ${
                isTimeout
                  ? 'text-warning-500'
                  : isCorrect
                  ? 'text-success-500'
                  : 'text-error-500'
              }`}
            >
              {isTimeout ? "Time's Up!" : isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>

          {/* Timeout Message - responsive sizing */}
          {isTimeout && (
            <View className="mb-3 sm:mb-4">
              <Text className={`text-text-secondary text-center ${textSize}`}>
                That counts as incorrect.
              </Text>
            </View>
          )}

          {/* Correct Answer - responsive sizing */}
          {!isCorrect && (
            <View className={`bg-background-tertiary rounded-lg mb-3 sm:mb-4 ${cardPadding}`}>
              <Text className={`text-text-secondary mb-1 ${labelSize}`}>
                Correct Answer:
              </Text>
              <Text className={`text-text-primary font-semibold ${textSize}`}>
                {optionLabels[correctIndex]}
              </Text>
            </View>
          )}

          {/* Explanation - responsive sizing */}
          <View className={`bg-background-tertiary rounded-lg mb-3 sm:mb-4 ${cardPadding}`}>
            <Text className={`text-text-secondary mb-1 ${labelSize}`}>
              Explanation:
            </Text>
            <Text className={`text-text-primary leading-5 ${textSize}`}>
              {explanation}
            </Text>
          </View>

          {/* Action Buttons - responsive sizing and touch-friendly */}
          <View className="gap-2">
            {onNext && (
              <Button
                variant="primary"
                size={buttonSize}
                onPress={onNext}
                fullWidth
              >
                Next Question →
              </Button>
            )}
            {questionId && onReportQuestion && (
              <Button
                variant="secondary"
                size={isMobile ? 'sm' : 'md'}
                onPress={handleReport}
                fullWidth
                disabled={isReporting}
              >
                {isReporting ? 'Reporting...' : '🚩 Report Question'}
              </Button>
            )}
          </View>
        </Card>
      </Container>
    </View>
  );
};
