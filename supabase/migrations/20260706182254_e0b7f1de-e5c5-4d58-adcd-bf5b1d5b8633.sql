
-- 1) Extend provider + agent kind enums
ALTER TYPE public.ai_provider ADD VALUE IF NOT EXISTS 'ollama';
ALTER TYPE public.ai_provider ADD VALUE IF NOT EXISTS 'foundry';
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'auth';
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'project';
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'vision';

-- 2) Security fix: restrict ai_endpoints SELECT to admins (protects api_key column)
DROP POLICY IF EXISTS endpoints_select_authenticated ON public.ai_endpoints;
CREATE POLICY endpoints_select_admin
  ON public.ai_endpoints FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
