-- Migration: Initial Schema
-- Description: Create all tables for TriviaNFT platform
-- Requirements: 49, 50

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stake_key VARCHAR(255) UNIQUE,
  anon_id VARCHAR(255) UNIQUE,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_player_identifier CHECK (
    (stake_key IS NOT NULL) OR (anon_id IS NOT NULL)
  ),
  CONSTRAINT chk_username_format CHECK (
    username IS NULL OR (username ~ '^[a-zA-Z0-9_-]{3,50}$')
  ),
  CONSTRAINT chk_email_format CHECK (
    email IS NULL OR (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
  )
);

CREATE INDEX idx_players_stake_key ON players(stake_key) WHERE stake_key IS NOT NULL;
CREATE INDEX idx_players_anon_id ON players(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_players_username ON players(username) WHERE username IS NOT NULL;
CREATE INDEX idx_players_created_at ON players(created_at DESC);

COMMENT ON TABLE players IS 'Stores player accounts (both guest and wallet-connected)';
COMMENT ON COLUMN players.stake_key IS 'Cardano stake key for wallet-connected players';
COMMENT ON COLUMN players.anon_id IS 'Anonymous identifier for guest players';

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_categories_active ON categories(is_active, display_order);

COMMENT ON TABLE categories IS 'Trivia categories (Science, History, etc.)';

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index SMALLINT NOT NULL,
  explanation TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'bedrock',
  difficulty VARCHAR(20) DEFAULT 'medium',
  hash VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_correct_index CHECK (correct_index >= 0 AND correct_index <= 3),
  CONSTRAINT chk_options_array CHECK (jsonb_array_length(options) = 4),
  CONSTRAINT chk_source CHECK (source IN ('bedrock', 'manual', 'community')),
  CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

CREATE INDEX idx_questions_category ON questions(category_id) WHERE is_active = true;
CREATE INDEX idx_questions_hash ON questions(hash);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);

COMMENT ON TABLE questions IS 'Trivia questions with multiple choice answers';
COMMENT ON COLUMN questions.hash IS 'SHA256 hash for deduplication';
COMMENT ON COLUMN questions.options IS 'Array of 4 answer options';

-- ============================================================================
-- QUESTION FLAGS TABLE
-- ============================================================================
CREATE TABLE question_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason TEXT,
  handled BOOLEAN NOT NULL DEFAULT false,
  handled_by UUID REFERENCES players(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_flags_unhandled ON question_flags(handled, created_at) WHERE handled = false;
CREATE INDEX idx_question_flags_question ON question_flags(question_id);

COMMENT ON TABLE question_flags IS 'Player-reported issues with questions';

-- ============================================================================
-- SESSIONS TABLE (Completed sessions only)
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stake_key VARCHAR(255),
  anon_id VARCHAR(255),
  category_id UUID NOT NULL REFERENCES categories(id),
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  score SMALLINT NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_status CHECK (status IN ('won', 'lost', 'forfeit')),
  CONSTRAINT chk_score CHECK (score >= 0 AND score <= 10),
  CONSTRAINT chk_timing CHECK (ended_at > started_at)
);

CREATE INDEX idx_sessions_player ON sessions(player_id, started_at DESC);
CREATE INDEX idx_sessions_category ON sessions(category_id, started_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status, started_at DESC);
CREATE INDEX idx_sessions_perfect ON sessions(player_id, category_id) WHERE score = 10;

COMMENT ON TABLE sessions IS 'Completed trivia sessions (active sessions stored in Redis)';
COMMENT ON COLUMN sessions.questions IS 'Array of question IDs, answers, and timing';

-- ============================================================================
-- SEASONS TABLE
-- ============================================================================
CREATE TABLE seasons (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  grace_days SMALLINT NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_season_dates CHECK (ends_at > starts_at),
  CONSTRAINT chk_grace_days CHECK (grace_days >= 0 AND grace_days <= 30)
);

CREATE INDEX idx_seasons_active ON seasons(is_active, starts_at);
CREATE INDEX idx_seasons_dates ON seasons(starts_at, ends_at);

COMMENT ON TABLE seasons IS 'Competitive seasons (3-month periods)';
COMMENT ON COLUMN seasons.grace_days IS 'Days after season end to allow seasonal forging';

-- ============================================================================
-- ELIGIBILITIES TABLE
-- ============================================================================
CREATE TABLE eligibilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL,
  category_id UUID REFERENCES categories(id),
  season_id VARCHAR(50) REFERENCES seasons(id),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stake_key VARCHAR(255),
  anon_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id),
  used_at TIMESTAMPTZ,
  CONSTRAINT chk_type CHECK (type IN ('category', 'master', 'season')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'used', 'expired')),
  CONSTRAINT chk_category_type CHECK (
    (type = 'category' AND category_id IS NOT NULL) OR
    (type != 'category')
  )
);

CREATE INDEX idx_eligibilities_active ON eligibilities(player_id, status, expires_at) 
  WHERE status = 'active';
CREATE INDEX idx_eligibilities_expiring ON eligibilities(expires_at) 
  WHERE status = 'active';
CREATE INDEX idx_eligibilities_category ON eligibilities(player_id, category_id, status);

COMMENT ON TABLE eligibilities IS 'Time-limited rights to mint NFTs';
COMMENT ON COLUMN eligibilities.expires_at IS '1 hour for connected, 25 min for guest';

-- ============================================================================
-- NFT CATALOG TABLE
-- ============================================================================
CREATE TABLE nft_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  s3_art_key VARCHAR(500) NOT NULL,
  s3_meta_key VARCHAR(500) NOT NULL,
  ipfs_cid VARCHAR(100),
  is_minted BOOLEAN NOT NULL DEFAULT false,
  minted_at TIMESTAMPTZ,
  tier VARCHAR(20) NOT NULL DEFAULT 'category',
  attributes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tier CHECK (tier IN ('category', 'ultimate', 'master', 'seasonal'))
);

CREATE INDEX idx_nft_catalog_available ON nft_catalog(category_id, tier) 
  WHERE is_minted = false;
CREATE INDEX idx_nft_catalog_minted ON nft_catalog(is_minted, minted_at);

COMMENT ON TABLE nft_catalog IS 'Pre-generated NFT metadata and artwork';
COMMENT ON COLUMN nft_catalog.ipfs_cid IS 'IPFS CID after pinning (set during mint)';

-- ============================================================================
-- MINTS TABLE
-- ============================================================================
CREATE TABLE mints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eligibility_id UUID NOT NULL REFERENCES eligibilities(id),
  catalog_id UUID NOT NULL REFERENCES nft_catalog(id),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stake_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  tx_hash VARCHAR(64),
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44),
  token_name VARCHAR(64),
  ipfs_cid VARCHAR(100),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT chk_mint_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

CREATE INDEX idx_mints_player ON mints(player_id, created_at DESC);
CREATE INDEX idx_mints_status ON mints(status, created_at);
CREATE INDEX idx_mints_tx_hash ON mints(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_mints_eligibility ON mints(eligibility_id);

COMMENT ON TABLE mints IS 'NFT minting operations and blockchain transactions';

-- ============================================================================
-- PLAYER NFTS TABLE
-- ============================================================================
CREATE TABLE player_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stake_key VARCHAR(255) NOT NULL,
  policy_id VARCHAR(56) NOT NULL,
  asset_fingerprint VARCHAR(44) NOT NULL UNIQUE,
  token_name VARCHAR(64) NOT NULL,
  source VARCHAR(20) NOT NULL,
  category_id UUID REFERENCES categories(id),
  season_id VARCHAR(50) REFERENCES seasons(id),
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  minted_at TIMESTAMPTZ NOT NULL,
  burned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_source CHECK (source IN ('mint', 'forge')),
  CONSTRAINT chk_tier CHECK (tier IN ('category', 'ultimate', 'master', 'seasonal')),
  CONSTRAINT chk_status CHECK (status IN ('confirmed', 'burned'))
);

CREATE INDEX idx_player_nfts_owner ON player_nfts(stake_key, status) 
  WHERE status = 'confirmed';
CREATE INDEX idx_player_nfts_category ON player_nfts(stake_key, category_id, status);
CREATE INDEX idx_player_nfts_fingerprint ON player_nfts(asset_fingerprint);
CREATE INDEX idx_player_nfts_tier ON player_nfts(stake_key, tier, status);

COMMENT ON TABLE player_nfts IS 'NFTs owned by players (confirmed on-chain)';
COMMENT ON COLUMN player_nfts.asset_fingerprint IS 'CIP-14 asset fingerprint';

-- ============================================================================
-- FORGE OPERATIONS TABLE
-- ============================================================================
CREATE TABLE forge_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL,
  stake_key VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id),
  season_id VARCHAR(50) REFERENCES seasons(id),
  input_fingerprints JSONB NOT NULL,
  burn_tx_hash VARCHAR(64),
  mint_tx_hash VARCHAR(64),
  output_asset_fingerprint VARCHAR(44),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT chk_forge_type CHECK (type IN ('category', 'master', 'season')),
  CONSTRAINT chk_forge_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

CREATE INDEX idx_forge_operations_player ON forge_operations(stake_key, created_at DESC);
CREATE INDEX idx_forge_operations_status ON forge_operations(status, created_at);
CREATE INDEX idx_forge_operations_type ON forge_operations(type, status);

COMMENT ON TABLE forge_operations IS 'NFT forging operations (burn + mint)';

-- ============================================================================
-- SEASON POINTS TABLE
-- ============================================================================
CREATE TABLE season_points (
  season_id VARCHAR(50) NOT NULL REFERENCES seasons(id),
  stake_key VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  perfect_scores INTEGER NOT NULL DEFAULT 0,
  nfts_minted INTEGER NOT NULL DEFAULT 0,
  avg_answer_ms INTEGER NOT NULL DEFAULT 0,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  first_achieved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, stake_key),
  CONSTRAINT chk_points CHECK (points >= 0),
  CONSTRAINT chk_perfect_scores CHECK (perfect_scores >= 0),
  CONSTRAINT chk_nfts_minted CHECK (nfts_minted >= 0)
);

CREATE INDEX idx_season_points_leaderboard ON season_points(season_id, points DESC, nfts_minted DESC);
CREATE INDEX idx_season_points_player ON season_points(stake_key, season_id);

COMMENT ON TABLE season_points IS 'Player points and stats per season';

-- ============================================================================
-- LEADERBOARD SNAPSHOTS TABLE
-- ============================================================================
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id VARCHAR(50) NOT NULL REFERENCES seasons(id),
  snapshot_date DATE NOT NULL,
  stake_key VARCHAR(255) NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  nfts_minted INTEGER NOT NULL,
  perfect_scores INTEGER NOT NULL,
  avg_answer_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rank CHECK (rank > 0)
);

CREATE INDEX idx_leaderboard_snapshots_season ON leaderboard_snapshots(season_id, snapshot_date, rank);
CREATE INDEX idx_leaderboard_snapshots_player ON leaderboard_snapshots(stake_key, season_id, snapshot_date);
CREATE UNIQUE INDEX idx_leaderboard_snapshots_unique ON leaderboard_snapshots(season_id, snapshot_date, stake_key);

COMMENT ON TABLE leaderboard_snapshots IS 'Daily snapshots of leaderboard standings';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default categories
INSERT INTO categories (id, name, slug, description, display_order) VALUES
  (uuid_generate_v4(), 'Science', 'science', 'Questions about physics, chemistry, biology, and astronomy', 1),
  (uuid_generate_v4(), 'History', 'history', 'Questions about world history and historical events', 2),
  (uuid_generate_v4(), 'Geography', 'geography', 'Questions about countries, cities, and physical geography', 3),
  (uuid_generate_v4(), 'Sports', 'sports', 'Questions about various sports and athletes', 4),
  (uuid_generate_v4(), 'Arts', 'arts', 'Questions about visual arts, music, and performing arts', 5),
  (uuid_generate_v4(), 'Entertainment', 'entertainment', 'Questions about movies, TV shows, and pop culture', 6),
  (uuid_generate_v4(), 'Technology', 'technology', 'Questions about computers, internet, and modern technology', 7),
  (uuid_generate_v4(), 'Literature', 'literature', 'Questions about books, authors, and literary works', 8),
  (uuid_generate_v4(), 'Weird & Wonderful', 'weird-wonderful', 'Questions about strange, surprising, and mind-blowing facts from all kinds of topics', 9);

-- Insert initial season (Winter Season 1)
INSERT INTO seasons (id, name, starts_at, ends_at, grace_days, is_active) VALUES
  ('winter-s1', 'Winter Season 1', NOW(), NOW() + INTERVAL '3 months', 7, true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for season_points updated_at
CREATE TRIGGER update_season_points_updated_at
  BEFORE UPDATE ON season_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update player last_seen_at
CREATE OR REPLACE FUNCTION update_player_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players 
  SET last_seen_at = NOW() 
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen_at when session is created
CREATE TRIGGER update_player_last_seen_on_session
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_player_last_seen();

-- ============================================================================
-- GRANTS (for application user)
-- ============================================================================

-- Note: Grants will be applied after the trivia_app user is created
-- These are documented here for reference:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trivia_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trivia_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO trivia_app;
