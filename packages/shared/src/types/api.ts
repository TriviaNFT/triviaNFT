/**
 * API request and response types
 */

import type {
  Session,
  SessionResult,
  Player,
  Eligibility,
  NFT,
  MintOperation,
  ForgeOperation,
  ForgeProgress,
  LeaderboardPage,
  Category,
} from './models';

// ============================================================================
// Authentication API
// ============================================================================

export interface ConnectWalletRequest {
  stakeKey: string;
}

export interface ConnectWalletResponse {
  token: string;
  player: Player;
  isNewUser: boolean;
}

export interface CreateProfileRequest {
  username: string;
  email?: string;
}

export interface CreateProfileResponse {
  player: Player;
}

export interface GetCurrentUserResponse {
  player: Player;
  remainingPlays: number;
  resetAt: string;
}

// ============================================================================
// Session API
// ============================================================================

export interface StartSessionRequest {
  categoryId: string;
}

export interface StartSessionResponse {
  session: Session;
}

export interface SubmitAnswerRequest {
  questionIndex: number;
  optionIndex: number;
  timeMs: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  score: number;
}

export interface CompleteSessionResponse {
  result: SessionResult;
}

export interface GetSessionHistoryRequest {
  limit?: number;
  offset?: number;
}

export interface GetSessionHistoryResponse {
  sessions: Session[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Question API
// ============================================================================

export interface FlagQuestionRequest {
  questionId: string;
  reason: string;
}

export interface FlagQuestionResponse {
  success: boolean;
}

// ============================================================================
// Eligibility API
// ============================================================================

export interface GetEligibilitiesResponse {
  eligibilities: Eligibility[];
}

// ============================================================================
// Mint API
// ============================================================================

export interface InitiateMintRequest {
  eligibilityId: string;
}

export interface InitiateMintResponse {
  mintOperation: MintOperation;
}

export interface GetMintStatusResponse {
  mintOperation: MintOperation;
  nft?: NFT;
}

// ============================================================================
// Forge API
// ============================================================================

export interface GetForgeProgressResponse {
  progress: ForgeProgress[];
}

export interface InitiateForgeRequest {
  type: 'category' | 'master' | 'season';
  categoryId?: string;
  seasonId?: string;
  inputFingerprints: string[];
}

export interface InitiateForgeResponse {
  forgeOperation: ForgeOperation;
}

export interface GetForgeStatusResponse {
  forgeOperation: ForgeOperation;
  ultimateNFT?: NFT;
}

// ============================================================================
// Leaderboard API
// ============================================================================

export interface GetLeaderboardRequest {
  seasonId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

export interface GetLeaderboardResponse {
  leaderboard: LeaderboardPage;
}

// ============================================================================
// Profile API
// ============================================================================

export interface GetProfileResponse {
  player: Player;
  stats: PlayerStats;
}

export interface PlayerStats {
  totalSessions: number;
  perfectScores: number;
  totalNFTs: number;
  currentSeasonPoints: number;
  currentSeasonRank?: number;
}

export interface GetPlayerNFTsResponse {
  nfts: NFT[];
  total: number;
}

export interface GetPlayerActivityResponse {
  activities: Activity[];
  total: number;
}

export interface Activity {
  id: string;
  type: 'mint' | 'forge' | 'session';
  timestamp: Date;
  details: Record<string, unknown>;
}

// ============================================================================
// Category API
// ============================================================================

export interface GetCategoriesResponse {
  categories: Category[];
}

export interface GetCategoryResponse {
  category: Category;
}

// ============================================================================
// Season API
// ============================================================================

export interface GetCurrentSeasonResponse {
  season: {
    id: string;
    name: string;
    endsAt: string;
    gracePeriodEndsAt: string;
    activeCategories: string[];
  };
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
