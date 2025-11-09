import { apiRequest } from './api';
import type { GetPlayerNFTsResponse, PlayerNFT } from '@trivia-nft/shared';

export interface GetNFTsParams {
  categoryId?: string;
  sortBy?: 'mintedAt' | 'category' | 'name';
  limit?: number;
  offset?: number;
}

export const nftService = {
  /**
   * Get player's owned NFTs
   */
  getPlayerNFTs: async (params?: GetNFTsParams): Promise<GetPlayerNFTsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/profile/nfts?${query}` : '/profile/nfts';

    return apiRequest<GetPlayerNFTsResponse>(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
