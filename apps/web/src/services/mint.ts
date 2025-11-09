import { apiRequest } from './api';
import type {
  GetEligibilitiesResponse,
  InitiateMintResponse,
  GetMintStatusResponse,
} from '@trivia-nft/shared';

export const mintService = {
  /**
   * Get active mint eligibilities for the current player
   */
  getEligibilities: async (): Promise<GetEligibilitiesResponse> => {
    return apiRequest<GetEligibilitiesResponse>('/eligibilities', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Initiate minting process for an eligibility
   */
  initiateMint: async (eligibilityId: string): Promise<InitiateMintResponse> => {
    return apiRequest<InitiateMintResponse>(`/mint/${eligibilityId}`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Get mint operation status
   */
  getMintStatus: async (mintId: string): Promise<GetMintStatusResponse> => {
    return apiRequest<GetMintStatusResponse>(`/mint/${mintId}/status`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
