import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SessionQuestion } from '@trivia-nft/shared';
import { Card } from './ui/Card';
import { Timer } from './ui/Timer';
import { Container } from './ui/Container';
import { useResponsive } from '../hooks/useResponsive';
import { useFocusRing } from '../hooks/useFocusRing';

export interface QuestionCardProps {
  question: SessionQuestion;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  onAnswer: (optionIndex: number) => void;
  disabled: boolean;
  selectedIndex?: number;
}

// 🧪 TESTING MODE: Set to true to highlight correct answers
const SHOW_CORRECT_ANSWER = true; // ← Change to false to disable

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeRemaining,
  onAnswer,
  disabled,
  selectedIndex,
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Debug log to verify correctIndex is received
  React.useEffect(() => {
    if (SHOW_CORRECT_ANSWER) {
      console.log('[TESTING] Question correctIndex:', question.correctIndex);
      console.log('[TESTING] Full question:', question);
    }
  }, [question]);

  // Responsive text sizing
  const questionTextSize = isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl';
  const optionTextSize = isMobile ? 'text-sm' : 'text-base';
  const progressTextSize = isMobile ? 'text-xs' : 'text-sm';
  
  // Responsive spacing
  const timerMargin = isMobile ? 'mb-6' : 'mb-8';
  const cardMargin = isMobile ? 'mb-4' : 'mb-6';
  const optionGap = isMobile ? 'gap-2' : 'gap-3';
  
  // Responsive padding for answer options - ensure touch-friendly on mobile
  const optionPadding = isMobile ? 'p-3' : 'p-4';
  
  // Ensure minimum touch target size (44x44px)
  const minTouchHeight = 'min-h-[44px]';

  return (
    <View className="flex-1 w-full">
      <Container maxWidth="md" className="pt-24 pb-4 sm:pb-6">
      {/* Progress Indicator */}
      <View className="mb-4 sm:mb-6">
        <Text className={`text-text-secondary text-center ${progressTextSize}`}>
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

      {/* Timer - responsive sizing */}
      <View className={`items-center ${timerMargin}`}>
        <Timer
          seconds={timeRemaining}
          size={isMobile ? 'md' : 'lg'}
          showProgress={true}
        />
      </View>

      {/* Question Text - responsive sizing and wrapping */}
      <Card variant="elevated" className={cardMargin}>
        <Text 
          className={`font-semibold text-text-primary text-center ${questionTextSize}`}
          style={{ flexWrap: 'wrap', maxWidth: '100%' }}
        >
          {question.text}
        </Text>
      </Card>

      {/* Answer Options - responsive sizing and touch targets */}
      <View className={optionGap}>
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = SHOW_CORRECT_ANSWER && index === question.correctIndex;
          
          return (
            <AnswerOption
              key={index}
              option={option}
              index={index}
              isSelected={isSelected}
              isCorrect={isCorrect}
              disabled={disabled}
              onAnswer={onAnswer}
              isMobile={isMobile}
              minTouchHeight={minTouchHeight}
              optionPadding={optionPadding}
              optionTextSize={optionTextSize}
            />
          );
        })}
      </View>
      </Container>
    </View>
  );
};

// Separate component for answer options with focus management
const AnswerOption: React.FC<{
  option: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  disabled: boolean;
  onAnswer: (index: number) => void;
  isMobile: boolean;
  minTouchHeight: string;
  optionPadding: string;
  optionTextSize: string;
}> = ({ option, index, isSelected, isCorrect, disabled, onAnswer, isMobile, minTouchHeight, optionPadding, optionTextSize }) => {
  const { onFocus, onBlur, getFocusRingStyle } = useFocusRing();
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <Pressable
      onPress={() => !disabled && onAnswer(index)}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Answer ${optionLabels[index]}: ${option}`}
      className={`
        ${minTouchHeight} rounded-xl ${optionPadding} flex-row items-center
        ${disabled ? 'opacity-50' : 'active:opacity-80'}
        ${
          isSelected
            ? 'bg-primary-600 border-2 border-primary-400'
            : isCorrect
            ? 'bg-green-900/30 border-2 border-green-500'
            : 'bg-background-secondary border-2 border-background-tertiary'
        }
      `}
      style={[{ width: '100%' }, getFocusRingStyle()]}
    >
              {/* Option Label - touch-friendly size */}
              <View
                className={`
                  w-8 h-8 rounded-full items-center justify-center mr-3 flex-shrink-0
                  ${isSelected ? 'bg-primary-400' : isCorrect ? 'bg-green-500' : 'bg-background-tertiary'}
                `}
              >
                <Text
                  className={`
                    font-bold ${isMobile ? 'text-sm' : 'text-base'}
                    ${isSelected ? 'text-white' : isCorrect ? 'text-white' : 'text-text-secondary'}
                  `}
                >
                  {optionLabels[index]}
                </Text>
              </View>

              {/* Option Text - wraps properly, no horizontal scroll */}
              <Text
                className={`
                  flex-1 ${optionTextSize}
                  ${isSelected ? 'text-white font-semibold' : isCorrect ? 'text-green-400 font-semibold' : 'text-text-primary'}
                `}
                style={{ flexWrap: 'wrap', flexShrink: 1 }}
              >
                {option}
              </Text>

      {/* Testing Indicator */}
      {isCorrect && (
        <Text className="text-green-400 text-xs ml-2 flex-shrink-0">✓ Correct</Text>
      )}
    </Pressable>
  );
};
