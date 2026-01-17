/*
  # Add Performance Indexes to Attendees Table

  1. Performance Improvements
    - Add index on `forum_id` for filtering attendees by forum
    - Add index on `email` for email lookups
    - Add composite index on `(forum_id, email)` for combined queries
    - Add index on `stage` for filtering by approval stage
    - Add composite index on `(forum_id, stage)` for dashboard queries

  2. Notes
    - These indexes significantly improve query performance as the attendee list grows
    - Composite indexes support both individual column queries and combined queries
*/

-- Index for forum filtering (used in virtually all queries)
CREATE INDEX IF NOT EXISTS idx_attendees_forum_id 
  ON attendees(forum_id);

-- Index for email lookups (used during sync operations)
CREATE INDEX IF NOT EXISTS idx_attendees_email 
  ON attendees(email);

-- Composite index for forum + email lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_attendees_forum_email 
  ON attendees(forum_id, email);

-- Index for stage filtering (used for dashboard views)
CREATE INDEX IF NOT EXISTS idx_attendees_stage 
  ON attendees(stage);

-- Composite index for forum + stage queries (used in filtered views)
CREATE INDEX IF NOT EXISTS idx_attendees_forum_stage 
  ON attendees(forum_id, stage);

-- Index for executive profile status filtering
CREATE INDEX IF NOT EXISTS idx_attendees_exec_profile 
  ON attendees(executive_profile_received);

-- Composite index for forum + exec profile filtering
CREATE INDEX IF NOT EXISTS idx_attendees_forum_exec_profile 
  ON attendees(forum_id, executive_profile_received);
