import { apiRequest } from './api';
import type { GetCurrentSeasonResponse } from '@trivia-nft/shared/types';

/**
 * Get current season information
 */
export const getCurrentSeason = async (): Promise<GetCurrentSeasonResponse> => {
  return apiRequest<GetCurrentSeasonResponse>('/seasons/current', {
    requiresAuth: false,
  });
};
