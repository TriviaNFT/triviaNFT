import { useState, useCallback } from 'react';
import { useAuth } from '../contexts';
import type { WalletType } from '../types';

export const useWalletConnect = () => {
  const { connectWallet, disconnectWallet, wallet, isLoading } = useAuth();
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(
    async (walletName: WalletType) => {
      try {
        setError(null);
        await connectWallet(walletName);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to connect wallet');
        setError(error);
        throw error;
      }
    },
    [connectWallet]
  );

  const disconnect = useCallback(() => {
    setError(null);
    disconnectWallet();
  }, [disconnectWallet]);

  return {
    connect,
    disconnect,
    wallet,
    isConnected: !!wallet,
    isLoading,
    error,
  };
};
