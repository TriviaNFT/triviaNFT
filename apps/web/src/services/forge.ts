import { apiRequest } from './api';
import type {
  GetForgeProgressResponse,
  InitiateForgeRequest,
  InitiateForgeResponse,
  GetForgeStatusResponse,
} from '@trivia-nft/shared';

export const forgeService = {
  /**
   * Get forging progress for all forge types
   */
  getForgeProgress: async (): Promise<GetForgeProgressResponse> => {
    return apiRequest<GetForgeProgressResponse>('/forge/progress', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Initiate a forge operation
   */
  initiateForge: async (params: InitiateForgeRequest): Promise<InitiateForgeResponse> => {
    const endpoint = params.type === 'category' 
      ? '/forge/category'
      : params.type === 'master'
      ? '/forge/master'
      : '/forge/season';

    return apiRequest<InitiateForgeResponse>(endpoint, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(params),
    });
  },

  /**
   * Get forge operation status
   */
  getForgeStatus: async (forgeId: string): Promise<GetForgeStatusResponse> => {
    return apiRequest<GetForgeStatusResponse>(`/forge/${forgeId}/status`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Submit signed forge transaction
   */
  submitSignedForge: async (params: { forgeId: string; signedTxCBOR: string }): Promise<{ txHash: string; status: string; assetFingerprint: string }> => {
    return apiRequest(`/forge/submit-signed`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(params),
    });
  },
};
