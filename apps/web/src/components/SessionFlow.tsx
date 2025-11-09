import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import type { Session, SessionResult } from '@trivia-nft/shared';
import { sessionService } from '../services';
import { useSession } from '../contexts/SessionContext';
import { SessionStartScreen } from './SessionStartScreen';
import { QuestionCard } from './QuestionCard';
import { AnswerFeedback } from './AnswerFeedback';

export interface SessionFlowProps {
  categoryId: string;
  categoryName: string;
  stockAvailable?: number;
  onComplete: (result: SessionResult) => void;
  onError?: (error: Error) => void;
}

type SessionState = 'loading' | 'start' | 'question' | 'feedback' | 'completing';

export const SessionFlow: React.FC<SessionFlowProps> = ({
  categoryId,
  categoryName,
  stockAvailable,
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
  } | null>(null);

  // Initialize session
  useEffect(() => {
    // Check if we're recovering a session
    if (contextSession && contextSession.categoryId === categoryId) {
      setSession(contextSession);
      setState('question');
      setAnswerStartTime(Date.now());
    } else {
      startSession();
    }
  }, [categoryId, contextSession]);

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

    if (timeRemaining <= 0) {
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [state, timeRemaining, session]);

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
      });
      setState('feedback');

      // Auto-advance after 2 seconds
      setTimeout(() => {
        advanceToNextQuestion();
      }, 2000);
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
      });
      setState('feedback');

      // Auto-advance after 2 seconds
      setTimeout(() => {
        advanceToNextQuestion();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      onError?.(error as Error);
    }
  };

  const advanceToNextQuestion = () => {
    if (!session) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      // Session complete
      completeSession();
    } else {
      // Move to next question
      setCurrentQuestionIndex(nextIndex);
      setSelectedIndex(undefined);
      setTimeRemaining(10);
      setAnswerStartTime(Date.now());
      setFeedbackData(null);
      setState('question');
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

  if (state === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className="text-text-secondary mt-4">Starting session...</Text>
      </View>
    );
  }

  if (state === 'start') {
    return (
      <SessionStartScreen
        categoryName={categoryName}
        stockAvailable={stockAvailable}
        onStart={handleStartQuestions}
      />
    );
  }

  if (state === 'completing') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className="text-text-secondary mt-4">Completing session...</Text>
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
