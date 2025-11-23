-- Migration: Make ended_at nullable and add 'active' status
-- Description: Allow sessions to be inserted before completion (on first answer)
-- This supports the "count after first answer" approach where sessions are
-- persisted to the database when the first answer is submitted, not at completion.

-- Make ended_at nullable (sessions can be active without being completed)
ALTER TABLE sessions 
  ALTER COLUMN ended_at DROP NOT NULL;

-- Make total_ms nullable (calculated at completion)
ALTER TABLE sessions 
  ALTER COLUMN total_ms DROP NOT NULL;

-- Update status constraint to include 'active'
ALTER TABLE sessions 
  DROP CONSTRAINT chk_status;

ALTER TABLE sessions 
  ADD CONSTRAINT chk_status CHECK (status IN ('active', 'won', 'lost', 'forfeit'));

-- Update timing constraint to allow NULL ended_at
ALTER TABLE sessions 
  DROP CONSTRAINT chk_timing;

ALTER TABLE sessions 
  ADD CONSTRAINT chk_timing CHECK (ended_at IS NULL OR ended_at > started_at);

-- Add comment explaining the new behavior
COMMENT ON COLUMN sessions.ended_at IS 'NULL for active sessions, set when session is completed';
COMMENT ON COLUMN sessions.started_at IS 'Set when first answer is submitted (commitment point)';
COMMENT ON COLUMN sessions.status IS 'active=in progress, won=6+ correct, lost=<6 correct, forfeit=abandoned';
