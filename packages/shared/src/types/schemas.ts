/**
 * Zod validation schemas
 */

import { z } from 'zod';
import {
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
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().uuid();
export const stakeKeySchema = z.string().regex(/^stake1[a-z0-9]{53}$/, {
  message: 'Invalid Cardano stake key format',
});
export const cardanoAddressSchema = z.string().regex(/^addr1[a-z0-9]{58,}$/, {
  message: 'Invalid Cardano address format',
});
export const emailSchema = z.string().email().optional();
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// ============================================================================
// Player Schemas
// ============================================================================

export const playerSchema = z.object({
  id: uuidSchema,
  stakeKey: stakeKeySchema.optional(),
  anonId: z.string().optional(),
  username: usernameSchema.optional(),
  email: emailSchema,
  createdAt: z.date(),
  lastSeenAt: z.date(),
});

// ============================================================================
// Session Schemas
// ============================================================================

export const sessionStatusSchema = z.nativeEnum(SessionStatus);

export const sessionQuestionSchema = z.object({
  questionId: uuidSchema,
  text: z.string(),
  options: z.array(z.string()).length(4),
  servedAt: z.string(),
  answeredIndex: z.number().int().min(0).max(3).optional(),
  timeMs: z.number().int().min(0).max(10000).optional(),
});

export const sessionSchema = z.object({
  id: uuidSchema,
  playerId: uuidSchema,
  stakeKey: stakeKeySchema.optional(),
  anonId: z.string().optional(),
  categoryId: uuidSchema,
  status: sessionStatusSchema,
  currentQuestionIndex: z.number().int().min(0).max(9),
  questions: z.array(sessionQuestionSchema),
  score: z.number().int().min(0).max(10),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  totalMs: z.number().int().min(0).optional(),
});

export const sessionResultSchema = z.object({
  score: z.number().int().min(0).max(10),
  totalQuestions: z.number().int().min(1),
  isPerfect: z.boolean(),
  eligibilityId: uuidSchema.optional(),
  status: sessionStatusSchema,
  totalMs: z.number().int().min(0),
});

// ============================================================================
// Question Schemas
// ============================================================================

export const questionSourceSchema = z.nativeEnum(QuestionSource);

export const questionSchema = z.object({
  id: uuidSchema,
  categoryId: uuidSchema,
  text: z.string().min(10).max(500),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(1000),
  source: questionSourceSchema,
  hash: z.string().optional(),
  createdAt: z.date().optional(),
});

// ============================================================================
// Category Schemas
// ============================================================================

export const categorySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  isActive: z.boolean(),
  iconUrl: z.string().url().optional(),
  nftCount: z.number().int().min(0).optional(),
  stockAvailable: z.number().int().min(0).optional(),
});

// ============================================================================
// Eligibility Schemas
// ============================================================================

export const eligibilityTypeSchema = z.nativeEnum(EligibilityType);
export const eligibilityStatusSchema = z.nativeEnum(EligibilityStatus);

export const eligibilitySchema = z.object({
  id: uuidSchema,
  type: eligibilityTypeSchema,
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
  playerId: uuidSchema,
  stakeKey: stakeKeySchema.optional(),
  anonId: z.string().optional(),
  status: eligibilityStatusSchema,
  expiresAt: z.string(),
  createdAt: z.string(),
  sessionId: uuidSchema,
});

// ============================================================================
// NFT Schemas
// ============================================================================

export const nftStatusSchema = z.nativeEnum(NFTStatus);
export const nftSourceSchema = z.nativeEnum(NFTSource);

export const nftAttributeSchema = z.object({
  trait_type: z.string(),
  value: z.string(),
});

export const nftMetadataSchema = z.object({
  name: z.string(),
  image: z.string(),
  description: z.string().optional(),
  attributes: z.array(nftAttributeSchema),
});

export const nftSchema = z.object({
  id: uuidSchema,
  stakeKey: stakeKeySchema,
  policyId: z.string(),
  assetFingerprint: z.string(),
  tokenName: z.string(),
  source: nftSourceSchema,
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
  status: nftStatusSchema,
  mintedAt: z.date(),
  metadata: nftMetadataSchema,
});

// ============================================================================
// Mint Schemas
// ============================================================================

export const mintStatusSchema = z.nativeEnum(MintStatus);

export const mintOperationSchema = z.object({
  id: uuidSchema,
  eligibilityId: uuidSchema,
  catalogId: uuidSchema,
  status: mintStatusSchema,
  txHash: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  confirmedAt: z.date().optional(),
});

// ============================================================================
// Forge Schemas
// ============================================================================

export const forgeTypeSchema = z.nativeEnum(ForgeType);
export const forgeStatusSchema = z.nativeEnum(ForgeStatus);

export const forgeOperationSchema = z.object({
  id: uuidSchema,
  type: forgeTypeSchema,
  stakeKey: stakeKeySchema,
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
  inputFingerprints: z.array(z.string()),
  burnTxHash: z.string().optional(),
  outputTxHash: z.string().optional(),
  outputAssetFingerprint: z.string().optional(),
  status: forgeStatusSchema,
  error: z.string().optional(),
  createdAt: z.date(),
  confirmedAt: z.date().optional(),
});

export const forgeProgressSchema = z.object({
  type: forgeTypeSchema,
  required: z.number().int().min(1),
  current: z.number().int().min(0),
  nfts: z.array(nftSchema),
  canForge: z.boolean(),
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
});

// ============================================================================
// Season Schemas
// ============================================================================

export const seasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  startsAt: z.date(),
  endsAt: z.date(),
  graceDays: z.number().int().min(0).max(30),
  isActive: z.boolean(),
});

export const seasonPointsSchema = z.object({
  seasonId: z.string(),
  stakeKey: stakeKeySchema,
  points: z.number().int().min(0),
  perfects: z.number().int().min(0),
  mintedCount: z.number().int().min(0),
  avgAnswerMs: z.number().int().min(0),
  sessionsUsed: z.number().int().min(0),
  firstAchievedAt: z.date(),
});

// ============================================================================
// Leaderboard Schemas
// ============================================================================

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  stakeKey: stakeKeySchema,
  username: z.string(),
  points: z.number().int().min(0),
  nftsMinted: z.number().int().min(0),
  perfectScores: z.number().int().min(0),
  avgAnswerTime: z.number().int().min(0),
  sessionsUsed: z.number().int().min(0).optional(),
});

export const leaderboardPageSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

// ============================================================================
// API Request Schemas
// ============================================================================

export const connectWalletRequestSchema = z.object({
  stakeKey: stakeKeySchema,
});

export const createProfileRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
});

export const startSessionRequestSchema = z.object({
  categoryId: uuidSchema,
});

export const submitAnswerRequestSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(10000),
});

export const flagQuestionRequestSchema = z.object({
  questionId: uuidSchema,
  reason: z.string().min(10).max(500),
});

export const initiateMintRequestSchema = z.object({
  eligibilityId: uuidSchema,
});

export const initiateForgeRequestSchema = z.object({
  type: forgeTypeSchema,
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
  inputFingerprints: z.array(z.string()).min(1),
});

export const getLeaderboardRequestSchema = z.object({
  seasonId: z.string().optional(),
  categoryId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getSessionHistoryRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
