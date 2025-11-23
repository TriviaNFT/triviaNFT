import type { WalletInfo, WalletType } from '../types';

// CIP-30 wallet detection
export const detectWallets = (): WalletInfo[] => {
  console.log('[wallet] Detecting wallets...');
  
  if (typeof window === 'undefined') {
    console.log('[wallet] Window is undefined (SSR)');
    return [];
  }
  
  if (!window.cardano) {
    console.log('[wallet] window.cardano not found - no Cardano wallets installed');
    console.log('[wallet] Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('cardano')));
    return [];
  }

  const wallets: WalletInfo[] = [];
  const cardano = window.cardano as any;
  
  console.log('[wallet] window.cardano found, checking for wallet extensions...');
  console.log('[wallet] Available cardano properties:', Object.keys(cardano));

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
      console.log(`[wallet] Found ${config.displayName} wallet`);
      wallets.push({
        name: key as WalletType,
        displayName: config.displayName,
        icon: config.icon,
        apiVersion: cardano[key].apiVersion || '0.1.0',
      });
    }
  });
  
  console.log(`[wallet] Total wallets detected: ${wallets.length}`);
  return wallets;
};

export const connectWallet = async (walletName: WalletType): Promise<any> => {
  console.log(`[wallet] connectWallet called for ${walletName}`);
  
  if (typeof window === 'undefined' || !window.cardano) {
    const error = 'Cardano wallets not available. Please install a CIP-30 compatible wallet extension (Nami, Eternl, Lace, etc.)';
    console.error('[wallet]', error);
    throw new Error(error);
  }

  const cardano = window.cardano as any;
  const wallet = cardano[walletName];

  if (!wallet) {
    const error = `Wallet ${walletName} not found. Available wallets: ${Object.keys(cardano).join(', ')}`;
    console.error('[wallet]', error);
    throw new Error(error);
  }

  try {
    console.log(`[wallet] Calling ${walletName}.enable()...`);
    const api = await wallet.enable();
    console.log(`[wallet] ${walletName} enabled successfully`);
    return api;
  } catch (error) {
    const errorMsg = `Failed to connect to ${walletName}: ${error instanceof Error ? error.message : String(error)}`;
    console.error('[wallet]', errorMsg);
    throw new Error(errorMsg);
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
    // CIP-30 returns addresses as hex-encoded CBOR
    const addressesHex = await api.getUsedAddresses();
    let hexAddress: string;
    
    if (!addressesHex || addressesHex.length === 0) {
      const unusedAddresses = await api.getUnusedAddresses();
      if (!unusedAddresses || unusedAddresses.length === 0) {
        throw new Error('No addresses found');
      }
      hexAddress = unusedAddresses[0];
    } else {
      hexAddress = addressesHex[0];
    }
    
    console.log('[wallet] Got hex address from wallet:', hexAddress.substring(0, 20) + '...');
    
    // Return the hex address - backend will convert to bech32
    // This avoids WASM loading issues in Metro bundler
    return hexAddress;
  } catch (error) {
    console.error('[wallet] Error getting address:', error);
    throw new Error(`Failed to get address: ${error}`);
  }
};

// Type augmentation for window.cardano
declare global {
  interface Window {
    cardano?: Record<string, any>;
  }
}
