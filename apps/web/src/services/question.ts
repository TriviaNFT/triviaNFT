import { apiRequest } from './api';

export interface FlagQuestionRequest {
  questionId: string;
  reason: string;
}

export interface FlagQuestionResponse {
  success: boolean;
}

export const questionService = {
  /**
   * Flag a question for review
   */
  flagQuestion: async (data: FlagQuestionRequest): Promise<FlagQuestionResponse> => {
    return apiRequest<FlagQuestionResponse>('/questions/flag', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },
};
