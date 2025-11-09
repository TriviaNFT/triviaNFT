import { apiRequest } from './api';
import type {
  GetLeaderboardRequest,
  GetLeaderboardResponse,
} from '@trivia-nft/shared';

/**
 * Get global leaderboard
 */
export const getGlobalLeaderboard = async (
  params: GetLeaderboardRequest = {}
): Promise<GetLeaderboardResponse> => {
  const { seasonId, limit = 20, offset = 0 } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (seasonId) {
    queryParams.append('seasonId', seasonId);
  }
  
  return apiRequest<GetLeaderboardResponse>(
    `/leaderboard/global?${queryParams.toString()}`,
    { requiresAuth: false }
  );
};

/**
 * Get category-specific leaderboard
 */
export const getCategoryLeaderboard = async (
  categoryId: string,
  params: GetLeaderboardRequest = {}
): Promise<GetLeaderboardResponse> => {
  const { seasonId, limit = 20, offset = 0 } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (seasonId) {
    queryParams.append('seasonId', seasonId);
  }
  
  return apiRequest<GetLeaderboardResponse>(
    `/leaderboard/category/${categoryId}?${queryParams.toString()}`,
    { requiresAuth: false }
  );
};

/**
 * Get season standings
 */
export const getSeasonStandings = async (
  seasonId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<GetLeaderboardResponse> => {
  const { limit = 20, offset = 0 } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  return apiRequest<GetLeaderboardResponse>(
    `/leaderboard/season/${seasonId}?${queryParams.toString()}`,
    { requiresAuth: false }
  );
};
