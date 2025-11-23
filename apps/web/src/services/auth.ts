import { apiRequest } from './api';
import type { Player, AuthTokens, ProfileCreationData } from '../types';

export interface ConnectWalletResponse {
  token: string;
  expiresIn: number;
  player: Player;
  isNewUser: boolean;
}

export interface CreateProfileResponse {
  player: Player;
}

export interface GetMeResponse {
  player: Player;
}

export const authService = {
  /**
   * Connect wallet and get JWT token
   */
  connectWallet: async (stakeKey: string, paymentAddress: string): Promise<ConnectWalletResponse> => {
    return apiRequest<ConnectWalletResponse>('/auth/connect', {
      method: 'POST',
      body: JSON.stringify({ stakeKey, paymentAddress }),
    });
  },

  /**
   * Create player profile (first-time users)
   */
  createProfile: async (data: ProfileCreationData): Promise<CreateProfileResponse> => {
    return apiRequest<CreateProfileResponse>('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * Get current user info
   */
  getMe: async (): Promise<GetMeResponse> => {
    return apiRequest<GetMeResponse>('/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
