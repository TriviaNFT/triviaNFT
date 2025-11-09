import { apiRequest } from './api';
import type {
  GetProfileResponse,
  GetPlayerNFTsResponse,
  GetPlayerActivityResponse,
} from '@trivia-nft/shared/types';

/**
 * Get player profile with stats
 */
export const getProfile = async (): Promise<GetProfileResponse> => {
  return apiRequest<GetProfileResponse>('/profile', {
    requiresAuth: true,
  });
};

/**
 * Get player's NFTs
 */
export const getPlayerNFTs = async (params: {
  limit?: number;
  offset?: number;
} = {}): Promise<GetPlayerNFTsResponse> => {
  const { limit = 20, offset = 0 } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  return apiRequest<GetPlayerNFTsResponse>(
    `/profile/nfts?${queryParams.toString()}`,
    { requiresAuth: true }
  );
};

/**
 * Get player's activity log (mints and forges)
 */
export const getPlayerActivity = async (params: {
  limit?: number;
  offset?: number;
} = {}): Promise<GetPlayerActivityResponse> => {
  const { limit = 20, offset = 0 } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  return apiRequest<GetPlayerActivityResponse>(
    `/profile/activity?${queryParams.toString()}`,
    { requiresAuth: true }
  );
};
