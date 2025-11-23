-- Add sync tracking columns to players table
-- This allows us to track when users were last synced

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sync_priority INTEGER DEFAULT 3;

-- Create index for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_players_last_seen_sync 
ON players(last_seen_at, last_synced_at);

-- Create sync metrics table for monitoring
CREATE TABLE IF NOT EXISTS sync_metrics (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMP DEFAULT NOW(),
  users_queued INTEGER DEFAULT 0,
  users_synced INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  priority_level VARCHAR(20)
);

-- Create sync queue table (simple queue without Redis initially)
CREATE TABLE IF NOT EXISTS sync_queue (
  id SERIAL PRIMARY KEY,
  stake_key VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority 
ON sync_queue(status, priority, created_at);

COMMENT ON TABLE sync_queue IS 'Queue for wallet sync jobs - processes users in priority order';
COMMENT ON COLUMN players.last_synced_at IS 'Last time this users wallet was synced with blockchain';
COMMENT ON COLUMN players.sync_priority IS '1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW, 5=MAINTENANCE';
