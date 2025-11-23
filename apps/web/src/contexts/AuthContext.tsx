import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ConnectedWallet, Player, WalletType } from '../types';
import { authService } from '../services';
import {
  saveAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  getOrCreateAnonId,
  clearAnonId,
  saveWalletName,
  getWalletName,
  clearWalletName,
  clearAllStorage,
} from '../utils/storage';
import { connectWallet as connectWalletUtil, getStakeKey, getAddress } from '../utils/wallet';

interface AuthContextValue {
  // State
  player: Player | null;
  wallet: ConnectedWallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  anonId: string;
  isNewUser: boolean;

  // Actions
  connectWallet: (walletName: WalletType) => Promise<void>;
  disconnectWallet: () => void;
  createProfile: (username: string, email?: string) => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonId] = useState(() => getOrCreateAnonId());
  const [isNewUser, setIsNewUser] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const tokens = getAuthTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }

      // Try to restore wallet connection
      const savedWalletName = getWalletName();
      if (savedWalletName) {
        try {
          const api = await connectWalletUtil(savedWalletName as WalletType);
          const stakeKey = await getStakeKey(api);
          const address = await getAddress(api);

          setWallet({
            stakeKey,
            address,
            walletName: savedWalletName,
            api,
          });
        } catch (error) {
          console.error('Failed to restore wallet connection:', error);
          clearWalletName();
        }
      }

      // Fetch player data
      const response = await authService.getMe();
      setPlayer(response.player);
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      clearAuthTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = useCallback(async (walletName: WalletType) => {
    try {
      setIsLoading(true);
      console.log(`[AuthContext] Starting wallet connection for ${walletName}...`);

      // Connect to wallet
      console.log('[AuthContext] Connecting to wallet extension...');
      const api = await connectWalletUtil(walletName);
      console.log('[AuthContext] Wallet extension connected, getting stake key...');
      
      const stakeKey = await getStakeKey(api);
      console.log('[AuthContext] Stake key retrieved:', stakeKey.substring(0, 20) + '...');
      
      const address = await getAddress(api);
      console.log('[AuthContext] Address retrieved:', address.substring(0, 20) + '...');

      // Call backend to get JWT (send both stake key and payment address)
      console.log('[AuthContext] Calling backend API to authenticate...');
      const response = await authService.connectWallet(stakeKey, address);
      console.log('[AuthContext] Backend authentication successful');
      console.log('[AuthContext] Is new user:', response.isNewUser);
      console.log('[AuthContext] Player has username:', !!response.player.username);

      // Save tokens
      saveAuthTokens({
        accessToken: response.token,
        expiresAt: Date.now() + response.expiresIn * 1000,
      });

      // Save wallet name for reconnection
      saveWalletName(walletName);

      // Update state
      setWallet({
        stakeKey,
        address,
        walletName,
        api,
      });
      setPlayer(response.player);
      
      // Set new user flag if they don't have a username
      setIsNewUser(response.isNewUser || !response.player.username);

      // Clear anon ID if user was guest
      if (!response.isNewUser) {
        clearAnonId();
      }
      
      console.log('[AuthContext] Wallet connection complete');
    } catch (error) {
      console.error('[AuthContext] Failed to connect wallet:', error);
      if (error instanceof Error) {
        console.error('[AuthContext] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setPlayer(null);
    clearAllStorage();
  }, []);

  const createProfile = useCallback(async (username: string, email?: string) => {
    try {
      setIsLoading(true);

      const response = await authService.createProfile({ username, email });
      setPlayer(response.player);
      setIsNewUser(false); // User is no longer new after creating profile
      console.log('[AuthContext] Profile created successfully');
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPlayer = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setPlayer(response.player);
    } catch (error) {
      console.error('Failed to refresh player:', error);
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    player,
    wallet,
    isAuthenticated: !!player && !!wallet,
    isLoading,
    anonId,
    isNewUser,
    connectWallet,
    disconnectWallet,
    createProfile,
    refreshPlayer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
