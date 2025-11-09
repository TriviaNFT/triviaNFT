/**
 * Enum types for statuses and constants
 */

export enum SessionStatus {
  ACTIVE = 'active',
  WON = 'won',
  LOST = 'lost',
  FORFEIT = 'forfeit',
}

export enum EligibilityStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
}

export enum EligibilityType {
  CATEGORY = 'category',
  MASTER = 'master',
  SEASON = 'season',
}

export enum NFTStatus {
  CONFIRMED = 'confirmed',
  BURNED = 'burned',
}

export enum NFTSource {
  MINT = 'mint',
  FORGE = 'forge',
}

export enum QuestionSource {
  BEDROCK = 'bedrock',
  MANUAL = 'manual',
}

export enum ForgeType {
  CATEGORY = 'category',
  MASTER = 'master',
  SEASON = 'season',
}

export enum MintStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum ForgeStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}
