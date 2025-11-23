import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import type { Session, SessionResult } from '@trivia-nft/shared';
import { sessionService, questionService } from '../services';
import { useSession } from '../contexts/SessionContext';
import { useResponsive } from '../hooks/useResponsive';
import { SessionStartScreen } from './SessionStartScreen';
import { QuestionCard } from './QuestionCard';
import { AnswerFeedback } from './AnswerFeedback';

export interface SessionFlowProps {
  categoryId: string;
  categoryName: string;
  nftCount?: number; // Number of NFT designs available
  onComplete: (result: SessionResult) => void;
  onError?: (error: Error) => void;
}

type SessionState = 'loading' | 'start' | 'question' | 'feedback' | 'completing';

export const SessionFlow: React.FC<SessionFlowProps> = ({
  categoryId,
  categoryName,
  nftCount,
  onComplete,
  onError,
}) => {
  const { setActiveSession, clearActiveSession, activeSession: contextSession } = useSession();
  const [state, setState] = useState<SessionState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [answerStartTime, setAnswerStartTime] = useState<number>(0);
  const [feedbackData, setFeedbackData] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation: string;
    isTimeout: boolean;
    questionId?: string;
  } | null>(null);
  
  // Track auto-advance timeout to cancel it if user manually advances
  const autoAdvanceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const handleReportQuestion = async (questionId: string, reason: string) => {
    try {
      await questionService.flagQuestion({ questionId, reason });
      console.log('[SessionFlow] Question reported successfully:', questionId);
    } catch (error) {
      console.error('[SessionFlow] Error reporting question:', error);
      throw error;
    }
  };

  // Initialize session
  useEffect(() => {
    // Always start a fresh session - don't recover old ones
    // User explicitly clicked to start a new session
    clearActiveSession(); // Clear any old session first
    startSession();
  }, [categoryId]); // Only depend on categoryId, not contextSession

  const startSession = async () => {
    try {
      setState('loading');
      const response = await sessionService.startSession({ categoryId });
      setSession(response.session);
      setActiveSession(response.session);
      setState('start');
    } catch (error) {
      console.error('Failed to start session:', error);
      onError?.(error as Error);
    }
  };

  const handleStartQuestions = useCallback(() => {
    setState('question');
    setAnswerStartTime(Date.now());
    setTimeRemaining(10);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (state !== 'question' || !session) return;

    setTimeRemaining(10); // Reset to 10 when starting new question

    // Start fresh timer for this question
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, session, currentQuestionIndex]); // Only restart when question changes

  const handleTimeout = async () => {
    if (!session) return;

    try {
      const timeMs = Date.now() - answerStartTime;
      const response = await sessionService.submitAnswer(session.id, {
        questionIndex: currentQuestionIndex,
        optionIndex: -1, // Timeout indicator
        timeMs,
      });

      setFeedbackData({
        isCorrect: false,
        correctIndex: response.correctIndex,
        explanation: response.explanation,
        isTimeout: true,
        questionId: session.questions[currentQuestionIndex].questionId,
      });
      setState('feedback');

      // Auto-advance after 5 seconds
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        advanceToNextQuestion();
      }, 5000);
    } catch (error) {
      console.error('Failed to submit timeout:', error);
      onError?.(error as Error);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!session || selectedIndex !== undefined) return;

    setSelectedIndex(optionIndex);

    try {
      const timeMs = Date.now() - answerStartTime;
      const response = await sessionService.submitAnswer(session.id, {
        questionIndex: currentQuestionIndex,
        optionIndex,
        timeMs,
      });

      setFeedbackData({
        isCorrect: response.correct,
        correctIndex: response.correctIndex,
        explanation: response.explanation,
        isTimeout: false,
        questionId: session.questions[currentQuestionIndex].questionId,
      });
      setState('feedback');

      // Auto-advance after 5 seconds
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        advanceToNextQuestion();
      }, 5000);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      onError?.(error as Error);
    }
  };

  const advanceToNextQuestion = () => {
    if (!session) return;

    // Cancel any pending auto-advance timeout
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      // Session complete
      completeSession();
    } else {
      // First clear feedback and reset timer
      setFeedbackData(null);
      setSelectedIndex(undefined);

      // Then update question index and reset timer in next tick
      // This ensures the timer effect cleanup runs before new timer starts
      requestAnimationFrame(() => {
        setCurrentQuestionIndex(nextIndex);
        setAnswerStartTime(Date.now());
        setState('question');
      });
    }
  };

  const completeSession = async () => {
    if (!session) return;

    try {
      setState('completing');
      const response = await sessionService.completeSession(session.id);
      clearActiveSession();
      onComplete(response.result);
    } catch (error) {
      console.error('Failed to complete session:', error);
      onError?.(error as Error);
    }
  };

  const { isMobile } = useResponsive();
  
  // Responsive text sizing for loading states
  const loadingTextSize = isMobile ? 'text-sm' : 'text-base';

  if (state === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background w-full">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className={`text-text-secondary mt-4 ${loadingTextSize}`}>Starting session...</Text>
      </View>
    );
  }

  if (state === 'start') {
    return (
      <SessionStartScreen
        categoryName={categoryName}
        nftCount={nftCount}
        onStart={handleStartQuestions}
      />
    );
  }

  if (state === 'completing') {
    return (
      <View className="flex-1 items-center justify-center bg-background w-full">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className={`text-text-secondary mt-4 ${loadingTextSize}`}>Completing session...</Text>
      </View>
    );
  }

  if (state === 'feedback' && feedbackData) {
    return (
      <AnswerFeedback
        isCorrect={feedbackData.isCorrect}
        correctIndex={feedbackData.correctIndex}
        explanation={feedbackData.explanation}
        isTimeout={feedbackData.isTimeout}
        questionId={feedbackData.questionId}
        onNext={advanceToNextQuestion}
        onReportQuestion={handleReportQuestion}
      />
    );
  }

  if (state === 'question' && session) {
    const currentQuestion = session.questions[currentQuestionIndex];

    return (
      <QuestionCard
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={session.questions.length}
        timeRemaining={timeRemaining}
        onAnswer={handleAnswer}
        disabled={selectedIndex !== undefined}
        selectedIndex={selectedIndex}
      />
    );
  }

  return null;
};
