import { apiRequest } from './api';
import type { Session, SessionResult } from '@trivia-nft/shared';

export interface StartSessionRequest {
  categoryId: string;
}

export interface StartSessionResponse {
  session: Session;
}

export interface SubmitAnswerRequest {
  questionIndex: number;
  optionIndex: number;
  timeMs: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  score: number;
}

export interface CompleteSessionResponse {
  result: SessionResult;
}

export interface SessionLimitsResponse {
  dailyLimit: number;
  sessionsUsed: number;
  remainingSessions: number;
  resetAt: string;
  cooldownEndsAt?: string;
}

export const sessionService = {
  /**
   * Get session limits and cooldown info
   */
  getSessionLimits: async (): Promise<SessionLimitsResponse> => {
    return apiRequest<SessionLimitsResponse>('/sessions/limits', {
      method: 'GET',
    });
  },

  /**
   * Start a new trivia session
   */
  startSession: async (data: StartSessionRequest): Promise<StartSessionResponse> => {
    return apiRequest<StartSessionResponse>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit an answer for the current question
   */
  submitAnswer: async (sessionId: string, data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
    return apiRequest<SubmitAnswerResponse>(`/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Complete the session
   */
  completeSession: async (sessionId: string): Promise<CompleteSessionResponse> => {
    return apiRequest<CompleteSessionResponse>(`/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  },

  /**
   * Get session by ID
   */
  getSession: async (sessionId: string): Promise<{ session: Session }> => {
    return apiRequest<{ session: Session }>(`/sessions/${sessionId}`, {
      method: 'GET',
    });
  },
};
