-- Migration 006: Create error_logs table for observability
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255),
  user_id VARCHAR(255),
  empresa_id VARCHAR(255),
  method VARCHAR(10),
  route TEXT,
  status_code INTEGER,
  error_code VARCHAR(100),
  message TEXT,
  stack TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_empresa_id ON error_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
