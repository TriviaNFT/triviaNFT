export interface ConnectedWallet {
  stakeKey: string;
  address: string;
  walletName: string;
  api: any; // CIP-30 wallet API
}

export interface Player {
  id: string;
  stakeKey?: string;
  anonId?: string;
  username?: string;
  email?: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface ProfileCreationData {
  username: string;
  email?: string;
}

export type WalletType = 'nami' | 'eternl' | 'lace' | 'typhon' | 'flint' | 'gerowallet';

export interface WalletInfo {
  name: WalletType;
  displayName: string;
  icon: string;
  apiVersion: string;
}
