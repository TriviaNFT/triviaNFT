import type { AuthTokens } from '../types';

const STORAGE_KEYS = {
  AUTH_TOKENS: 'trivia_nft_auth_tokens',
  ANON_ID: 'trivia_nft_anon_id',
  WALLET_NAME: 'trivia_nft_wallet_name',
} as const;

// Auth tokens
export const saveAuthTokens = (tokens: AuthTokens): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to save auth tokens:', error);
  }
};

export const getAuthTokens = (): AuthTokens | null => {
  try {
    const tokens = localStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    if (!tokens) return null;

    const parsed = JSON.parse(tokens) as AuthTokens;
    
    // Check if token is expired
    if (parsed.expiresAt < Date.now()) {
      clearAuthTokens();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to get auth tokens:', error);
    return null;
  }
};

export const clearAuthTokens = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
  } catch (error) {
    console.error('Failed to clear auth tokens:', error);
  }
};

// Anonymous ID for guest users
export const getOrCreateAnonId = (): string => {
  try {
    let anonId = localStorage.getItem(STORAGE_KEYS.ANON_ID);
    
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(STORAGE_KEYS.ANON_ID, anonId);
    }

    return anonId;
  } catch (error) {
    console.error('Failed to get/create anon ID:', error);
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

export const clearAnonId = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ANON_ID);
  } catch (error) {
    console.error('Failed to clear anon ID:', error);
  }
};

// Wallet name
export const saveWalletName = (walletName: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET_NAME, walletName);
  } catch (error) {
    console.error('Failed to save wallet name:', error);
  }
};

export const getWalletName = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.WALLET_NAME);
  } catch (error) {
    console.error('Failed to get wallet name:', error);
    return null;
  }
};

export const clearWalletName = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.WALLET_NAME);
  } catch (error) {
    console.error('Failed to clear wallet name:', error);
  }
};

// Clear all storage
export const clearAllStorage = (): void => {
  clearAuthTokens();
  clearAnonId();
  clearWalletName();
};
