import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './ui/Card';

export interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  isTimeout?: boolean;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({
  isCorrect,
  correctIndex,
  explanation,
  isTimeout = false,
}) => {
  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Card
        variant="elevated"
        className={`w-full max-w-md ${
          isTimeout
            ? 'border-2 border-warning-500'
            : isCorrect
            ? 'border-2 border-success-500'
            : 'border-2 border-error-500'
        }`}
      >
        {/* Result Icon and Message */}
        <View className="items-center mb-6">
          <Text className="text-6xl mb-3">
            {isTimeout ? '⏱️' : isCorrect ? '✓' : '✗'}
          </Text>
          <Text
            className={`text-2xl font-bold ${
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

        {/* Timeout Message */}
        {isTimeout && (
          <View className="mb-4">
            <Text className="text-text-secondary text-center">
              That counts as incorrect.
            </Text>
          </View>
        )}

        {/* Correct Answer */}
        {!isCorrect && (
          <View className="bg-background-tertiary rounded-lg p-3 mb-4">
            <Text className="text-text-secondary text-sm mb-1">
              Correct Answer:
            </Text>
            <Text className="text-text-primary font-semibold">
              {optionLabels[correctIndex]}
            </Text>
          </View>
        )}

        {/* Explanation */}
        <View className="bg-background-tertiary rounded-lg p-3">
          <Text className="text-text-secondary text-sm mb-1">
            Explanation:
          </Text>
          <Text className="text-text-primary text-sm leading-5">
            {explanation}
          </Text>
        </View>
      </Card>
    </View>
  );
};
