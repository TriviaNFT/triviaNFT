import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SessionQuestion } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Timer } from './ui/Timer';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';

export interface QuestionCardProps {
  question: SessionQuestion;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  onAnswer: (optionIndex: number) => void;
  disabled: boolean;
  selectedIndex?: number;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeRemaining,
  onAnswer,
  disabled,
  selectedIndex,
}) => {
  const { isMobile } = useResponsive();

  return (
    <View className="flex-1">
      <Container maxWidth="md" className="py-4 sm:py-6">
      {/* Progress Indicator */}
      <View className="mb-6">
        <Text className="text-text-secondary text-center text-sm">
          Question {questionNumber} of {totalQuestions}
        </Text>
        <View className="flex-row mt-2 gap-1">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <View
              key={index}
              className={`flex-1 h-1 rounded-full ${
                index < questionNumber - 1
                  ? 'bg-success-500'
                  : index === questionNumber - 1
                  ? 'bg-primary-500'
                  : 'bg-background-tertiary'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Timer */}
      <View className="items-center mb-8">
        <Timer
          seconds={timeRemaining}
          size="lg"
          showProgress={true}
        />
      </View>

      {/* Question Text */}
      <Card variant="elevated" className="mb-6">
        <Text className={`font-semibold text-text-primary text-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {question.text}
        </Text>
      </Card>

      {/* Answer Options */}
      <View className="gap-3">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          
          return (
            <Pressable
              key={index}
              onPress={() => !disabled && onAnswer(index)}
              disabled={disabled}
              className={`
                min-h-[44px] rounded-xl p-4 flex-row items-center
                ${disabled ? 'opacity-50' : 'active:opacity-80'}
                ${
                  isSelected
                    ? 'bg-primary-600 border-2 border-primary-400'
                    : 'bg-background-secondary border-2 border-background-tertiary'
                }
              `}
            >
              {/* Option Label */}
              <View
                className={`
                  w-8 h-8 rounded-full items-center justify-center mr-3
                  ${isSelected ? 'bg-primary-400' : 'bg-background-tertiary'}
                `}
              >
                <Text
                  className={`
                    font-bold
                    ${isSelected ? 'text-white' : 'text-text-secondary'}
                  `}
                >
                  {optionLabels[index]}
                </Text>
              </View>

              {/* Option Text */}
              <Text
                className={`
                  flex-1 text-base
                  ${isSelected ? 'text-white font-semibold' : 'text-text-primary'}
                `}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      </Container>
    </View>
  );
};
