
-- Agent kind enum
DO $$ BEGIN
  CREATE TYPE public.agent_kind AS ENUM ('copilot','core','prod','maint','finance','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ai_agents table
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text,
  kind public.agent_kind NOT NULL DEFAULT 'custom',
  version text,
  endpoint_id uuid REFERENCES public.ai_endpoints(id) ON DELETE SET NULL,
  model text,
  system_prompt text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents readable by authenticated"
  ON public.ai_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "agents managed by admin"
  ON public.ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed models into ai_endpoints
INSERT INTO public.ai_endpoints (name, provider, base_url, deployment_name, model, api_version, use_apim, is_default, enabled)
VALUES
  ('az-model-maint', 'azure_openai', NULL, 'az-model-maint', 'gpt-5.1', '2024-10-21', false, false, true),
  ('az-model-core', 'azure_openai', NULL, 'az-model-core', 'gpt-5.5', '2024-10-21', false, true, true),
  ('Azure-Speech-Speech-to-text', 'azure_openai', NULL, 'Azure-Speech-Speech-to-text', 'Azure-Speech-Speech-to-text', '2024-10-21', false, false, true),
  ('az-model-finance', 'azure_openai', NULL, 'az-model-finance', 'DeepSeek-V4-Pro', '2024-10-21', false, false, true),
  ('az-models-text', 'azure_openai', NULL, 'az-models-text', 'text-embedding-3-small', '2024-10-21', false, false, true),
  ('Azure-Speech-Voice-Live', 'azure_openai', NULL, 'Azure-Speech-Voice-Live', 'Azure-Speech-Voice-Live', '2024-10-21', false, false, true)
ON CONFLICT DO NOTHING;

-- Seed agents (link to core model by default when applicable)
INSERT INTO public.ai_agents (name, display_name, kind, version, model, endpoint_id, enabled)
VALUES
  ('az-agent-copilot', 'Copilot Agent', 'copilot', '2', 'gpt-5.5',
     (SELECT id FROM public.ai_endpoints WHERE name = 'az-model-core' LIMIT 1), true),
  ('az-agent-core', 'Core Agent', 'core', '3', 'gpt-5.5',
     (SELECT id FROM public.ai_endpoints WHERE name = 'az-model-core' LIMIT 1), true),
  ('az-agent-prod', 'Production Agent', 'prod', '3', 'gpt-5.5',
     (SELECT id FROM public.ai_endpoints WHERE name = 'az-model-core' LIMIT 1), true),
  ('az-agent-maint', 'Maintenance Agent', 'maint', '15', 'gpt-5.1',
     (SELECT id FROM public.ai_endpoints WHERE name = 'az-model-maint' LIMIT 1), true),
  ('az-agent-finance', 'Finance Agent', 'finance', '3', 'DeepSeek-V4-Pro',
     (SELECT id FROM public.ai_endpoints WHERE name = 'az-model-finance' LIMIT 1), true)
ON CONFLICT (name) DO NOTHING;
