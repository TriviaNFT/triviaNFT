import type { WalletInfo, WalletType } from '../types';

// CIP-30 wallet detection
export const detectWallets = (): WalletInfo[] => {
  if (typeof window === 'undefined' || !window.cardano) {
    return [];
  }

  const wallets: WalletInfo[] = [];
  const cardano = window.cardano as any;

  const walletConfigs: Record<WalletType, { displayName: string; icon: string }> = {
    nami: { displayName: 'Nami', icon: '🦊' },
    eternl: { displayName: 'Eternl', icon: '♾️' },
    lace: { displayName: 'Lace', icon: '🎀' },
    typhon: { displayName: 'Typhon', icon: '🌊' },
    flint: { displayName: 'Flint', icon: '🔥' },
    gerowallet: { displayName: 'Gero', icon: '💎' },
  };

  Object.entries(walletConfigs).forEach(([key, config]) => {
    if (cardano[key]) {
      wallets.push({
        name: key as WalletType,
        displayName: config.displayName,
        icon: config.icon,
        apiVersion: cardano[key].apiVersion || '0.1.0',
      });
    }
  });

  return wallets;
};

export const connectWallet = async (walletName: WalletType): Promise<any> => {
  if (typeof window === 'undefined' || !window.cardano) {
    throw new Error('Cardano wallets not available');
  }

  const cardano = window.cardano as any;
  const wallet = cardano[walletName];

  if (!wallet) {
    throw new Error(`Wallet ${walletName} not found`);
  }

  try {
    const api = await wallet.enable();
    return api;
  } catch (error) {
    throw new Error(`Failed to connect to ${walletName}: ${error}`);
  }
};

export const getStakeKey = async (api: any): Promise<string> => {
  try {
    const rewardAddresses = await api.getRewardAddresses();
    if (!rewardAddresses || rewardAddresses.length === 0) {
      throw new Error('No reward addresses found');
    }
    return rewardAddresses[0];
  } catch (error) {
    throw new Error(`Failed to get stake key: ${error}`);
  }
};

export const getAddress = async (api: any): Promise<string> => {
  try {
    const addresses = await api.getUsedAddresses();
    if (!addresses || addresses.length === 0) {
      const unusedAddresses = await api.getUnusedAddresses();
      if (!unusedAddresses || unusedAddresses.length === 0) {
        throw new Error('No addresses found');
      }
      return unusedAddresses[0];
    }
    return addresses[0];
  } catch (error) {
    throw new Error(`Failed to get address: ${error}`);
  }
};

// Type augmentation for window.cardano
declare global {
  interface Window {
    cardano?: Record<string, any>;
  }
}
