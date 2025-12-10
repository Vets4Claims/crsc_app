-- Add unique constraint on packet_status for (user_id, step_name)
-- This allows UPSERT operations in the chat handler

ALTER TABLE packet_status ADD CONSTRAINT unique_user_step UNIQUE (user_id, step_name);
