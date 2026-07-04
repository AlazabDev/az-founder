
-- Enums
CREATE TYPE public.ai_provider AS ENUM ('azure_openai','openai','lovable','apim');
CREATE TYPE public.policy_type AS ENUM ('rate_limit','quota','content_filter','cost_cap','circuit_breaker');
CREATE TYPE public.storage_provider AS ENUM ('azure_blob','aws_s3','google_drive','supabase');
CREATE TYPE public.usage_status AS ENUM ('success','blocked','error','rate_limited');
CREATE TYPE public.message_role AS ENUM ('system','user','assistant','tool');

-- ai_endpoints
CREATE TABLE public.ai_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider public.ai_provider NOT NULL,
  base_url text,
  deployment_name text,
  model text NOT NULL,
  api_version text,
  use_apim boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_endpoints TO authenticated;
GRANT ALL ON public.ai_endpoints TO service_role;
ALTER TABLE public.ai_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "endpoints_select_authenticated" ON public.ai_endpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "endpoints_admin_all" ON public.ai_endpoints FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_endpoints_updated BEFORE UPDATE ON public.ai_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- apim_policies
CREATE TABLE public.apim_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  policy_type public.policy_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  applies_to_endpoint_id uuid REFERENCES public.ai_endpoints(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apim_policies TO authenticated;
GRANT ALL ON public.apim_policies TO service_role;
ALTER TABLE public.apim_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policies_select_authenticated" ON public.apim_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "policies_admin_all" ON public.apim_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_apim_policies_updated BEFORE UPDATE ON public.apim_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_usage_logs
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint_id uuid REFERENCES public.ai_endpoints(id) ON DELETE SET NULL,
  conversation_id uuid,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  total_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms integer,
  status public.usage_status NOT NULL DEFAULT 'success',
  error text,
  flagged boolean NOT NULL DEFAULT false,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_user_created ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_created ON public.ai_usage_logs(created_at DESC);
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_select_self_or_admin" ON public.ai_usage_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ai_conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'محادثة جديدة',
  endpoint_id uuid REFERENCES public.ai_endpoints(id) ON DELETE SET NULL,
  system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_own_all" ON public.ai_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ai_conversations_updated BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_messages
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.message_role NOT NULL,
  content text NOT NULL,
  parts jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON public.ai_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_own_all" ON public.ai_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- storage_providers
CREATE TABLE public.storage_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.storage_provider NOT NULL,
  display_name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, display_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_providers TO authenticated;
GRANT ALL ON public.storage_providers TO service_role;
ALTER TABLE public.storage_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_select_auth" ON public.storage_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "storage_admin_all" ON public.storage_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_storage_providers_updated BEFORE UPDATE ON public.storage_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- rate_limit_counters
CREATE TABLE public.rate_limit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_id uuid REFERENCES public.ai_endpoints(id) ON DELETE CASCADE,
  window_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint_id, window_key, window_start)
);
CREATE INDEX idx_rl_lookup ON public.rate_limit_counters(user_id, endpoint_id, window_key, window_start);
GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- no policies for authenticated: service_role only

-- model_pricing (USD per 1K tokens)
CREATE TABLE public.model_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL UNIQUE,
  input_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  output_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_pricing TO authenticated;
GRANT ALL ON public.model_pricing TO service_role;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_select_auth" ON public.model_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_admin_all" ON public.model_pricing FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- seed common pricing
INSERT INTO public.model_pricing (model, input_per_1k, output_per_1k) VALUES
  ('gpt-4o', 0.0025, 0.010),
  ('gpt-4o-mini', 0.00015, 0.0006),
  ('gpt-4-turbo', 0.010, 0.030),
  ('gpt-35-turbo', 0.0005, 0.0015),
  ('gpt-4.1', 0.002, 0.008),
  ('gpt-4.1-mini', 0.0004, 0.0016)
ON CONFLICT DO NOTHING;

-- ensure only one default endpoint
CREATE OR REPLACE FUNCTION public.enforce_single_default_endpoint()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.ai_endpoints SET is_default = false WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_single_default_endpoint AFTER INSERT OR UPDATE OF is_default ON public.ai_endpoints
FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.enforce_single_default_endpoint();

CREATE OR REPLACE FUNCTION public.enforce_single_default_storage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.storage_providers SET is_default = false WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_single_default_storage AFTER INSERT OR UPDATE OF is_default ON public.storage_providers
FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.enforce_single_default_storage();
