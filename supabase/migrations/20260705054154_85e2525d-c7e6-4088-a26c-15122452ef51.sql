
ALTER TABLE public.ai_endpoints
  ADD COLUMN IF NOT EXISTS api_key text,
  ADD COLUMN IF NOT EXISTS extra_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_status text,
  ADD COLUMN IF NOT EXISTS last_latency_ms integer,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;
