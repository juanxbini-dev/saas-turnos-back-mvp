-- Migration: Create refresh_tokens table
-- Description: Table for storing refresh tokens with security features

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    last_used_at TIMESTAMP WITH TIME ZONE NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_active, revoked_at);

-- Foreign key constraint
ALTER TABLE refresh_tokens 
ADD CONSTRAINT IF NOT EXISTS fk_refresh_tokens_user_id 
FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for user authentication with rotation and revocation support';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hashed refresh token for security';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Token expiration time';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was revoked';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Last time token was used';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address that created the token';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser/user agent string';
COMMENT ON COLUMN refresh_tokens.is_active IS 'Whether token is currently active';
