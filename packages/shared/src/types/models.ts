/**
 * Core data models and interfaces
 */

import type {
  SessionStatus,
  EligibilityStatus,
  EligibilityType,
  NFTStatus,
  NFTSource,
  QuestionSource,
  ForgeType,
  MintStatus,
  ForgeStatus,
} from './enums';

// ============================================================================
// Player Models
// ============================================================================

export interface Player {
  id: string;
  stakeKey?: string;
  anonId?: string;
  username?: string;
  email?: string;
  paymentAddress?: string; // Bech32 payment address for NFT minting
  createdAt: Date;
  lastSeenAt: Date;
}

// ============================================================================
// Session Models
// ============================================================================

export interface Session {
  id: string;
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  categoryId: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  questions: SessionQuestion[];
  score: number;
  startedAt: string;
  endedAt?: string;
  totalMs?: number;
}

export interface SessionQuestion {
  questionId: string;
  text: string;
  options: string[];
  servedAt: string;
  answeredIndex?: number;
  timeMs?: number;
  // 🧪 TESTING ONLY: Remove in production
  correctIndex?: number;
}

export interface SessionResult {
  score: number;
  totalQuestions: number;
  isPerfect: boolean;
  eligibilityId?: string;
  status: SessionStatus;
  totalMs: number;
}

// ============================================================================
// Question Models
// ============================================================================

export interface Question {
  id: string;
  categoryId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: QuestionSource;
  hash?: string;
  createdAt?: Date;
}

export interface QuestionFlag {
  id: string;
  questionId: string;
  playerId: string;
  reason: string;
  handled: boolean;
  createdAt: Date;
}

// ============================================================================
// Category Models
// ============================================================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  iconUrl?: string;
  nftImageIpfs?: string; // IPFS hash for NFT thumbnail
  nftVideoIpfs?: string; // IPFS hash for NFT video
  visualDescription?: string; // Description of what the NFT visual represents
  nftCount?: number; // Number of NFT designs available
  ownedCount?: number; // Number of NFTs owned by the current player
  stockAvailable?: number; // Deprecated: kept for backward compatibility
}

// ============================================================================
// Eligibility Models
// ============================================================================

export interface Eligibility {
  id: string;
  type: EligibilityType;
  categoryId?: string;
  seasonId?: string;
  playerId: string;
  stakeKey?: string;
  anonId?: string;
  status: EligibilityStatus;
  expiresAt: string;
  createdAt: string;
  sessionId: string;
}

// ============================================================================
// NFT Models
// ============================================================================

export interface NFT {
  id: string;
  stakeKey: string;
  policyId: string;
  assetFingerprint: string;
  tokenName: string;
  source: NFTSource;
  categoryId?: string;
  seasonId?: string;
  status: NFTStatus;
  mintedAt: Date;
  metadata: NFTMetadata;
}

export interface NFTMetadata {
  name: string;
  image: string;
  description?: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFTCatalog {
  id: string;
  categoryId: string;
  name: string;
  s3ArtKey: string;
  s3MetaKey: string;
  ipfsCid?: string;
  isMinted: boolean;
  mintedAt?: Date;
  tier?: string;
  attributes?: Record<string, any>;
}

export interface PlayerNFT {
  id: string;
  stakeKey: string;
  policyId: string;
  assetFingerprint: string;
  tokenName: string;
  source: NFTSource;
  categoryId?: string;
  seasonId?: string;
  tier: string;
  status: NFTStatus;
  mintedAt: string;
  burnedAt?: string;
  metadata: NFTMetadata;
  createdAt: string;
}

// ============================================================================
// Mint Models
// ============================================================================

export interface MintOperation {
  id: string;
  eligibilityId: string;
  catalogId: string;
  status: MintStatus;
  txHash?: string;
  error?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

// ============================================================================
// Forge Models
// ============================================================================

export interface ForgeOperation {
  id: string;
  type: ForgeType;
  stakeKey: string;
  categoryId?: string;
  seasonId?: string;
  inputFingerprints: string[];
  burnTxHash?: string;
  mintTxHash?: string;
  outputAssetFingerprint?: string;
  status: ForgeStatus;
  error?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface ForgeProgress {
  type: ForgeType;
  required: number;
  current: number;
  nfts: PlayerNFT[];
  canForge: boolean;
  categoryId?: string;
  seasonId?: string;
}

// ============================================================================
// Season Models
// ============================================================================

export interface Season {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  graceDays: number;
  isActive: boolean;
}

export interface SeasonPoints {
  seasonId: string;
  stakeKey: string;
  points: number;
  perfects: number;
  mintedCount: number;
  avgAnswerMs: number;
  sessionsUsed: number;
  firstAchievedAt: Date;
}

// ============================================================================
// Leaderboard Models
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  stakeKey: string;
  username: string;
  points: number;
  nftsMinted: number;
  perfectScores: number;
  avgAnswerTime: number;
  sessionsUsed?: number;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Wallet Models
// ============================================================================

export interface ConnectedWallet {
  stakeKey: string;
  address: string;
  walletName: string;
}
