-- Migration: Add veteran verification support
-- This migration adds ID.me veteran verification tracking to the database

-- Add verification columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS veteran_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS veteran_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS idme_uuid VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS military_status VARCHAR(100);

-- Create index for verification lookups
CREATE INDEX IF NOT EXISTS idx_users_veteran_verified ON users(veteran_verified);
CREATE INDEX IF NOT EXISTS idx_users_idme_uuid ON users(idme_uuid);

-- Create verification attempts log for audit trail
CREATE TABLE IF NOT EXISTS verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'idme',
    status VARCHAR(50) NOT NULL, -- 'initiated', 'success', 'failed', 'expired'
    military_status VARCHAR(100),
    idme_uuid VARCHAR(255),
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for verification log lookups
CREATE INDEX IF NOT EXISTS idx_verification_log_user_id ON verification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_created_at ON verification_log(created_at);

-- Add comment for documentation
COMMENT ON COLUMN users.veteran_verified IS 'Whether user has verified veteran status via ID.me';
COMMENT ON COLUMN users.veteran_verified_at IS 'Timestamp when veteran status was verified';
COMMENT ON COLUMN users.idme_uuid IS 'ID.me unique user identifier';
COMMENT ON COLUMN users.military_status IS 'Military status returned from ID.me (e.g., veteran, active_duty, retired)';
COMMENT ON TABLE verification_log IS 'Audit log for all veteran verification attempts';
