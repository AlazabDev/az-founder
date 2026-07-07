-- Tighten RLS policies

-- profiles: own or admin
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- whatsapp_messages: admin only
DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_select_admin ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select_admin ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ai_agents: admin only
DROP POLICY IF EXISTS agents_select_authenticated ON public.ai_agents;
DROP POLICY IF EXISTS "agents readable by authenticated" ON public.ai_agents;
DROP POLICY IF EXISTS agents_select_admin ON public.ai_agents;
CREATE POLICY agents_select_admin ON public.ai_agents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- apim_policies: admin only
DROP POLICY IF EXISTS policies_select_authenticated ON public.apim_policies;
DROP POLICY IF EXISTS policies_select_admin ON public.apim_policies;
CREATE POLICY policies_select_admin ON public.apim_policies
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- model_pricing: admin only
DROP POLICY IF EXISTS pricing_select_auth ON public.model_pricing;
DROP POLICY IF EXISTS pricing_select_admin ON public.model_pricing;
CREATE POLICY pricing_select_admin ON public.model_pricing
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- storage_providers: admin only
DROP POLICY IF EXISTS storage_select_auth ON public.storage_providers;
DROP POLICY IF EXISTS storage_select_admin ON public.storage_providers;
CREATE POLICY storage_select_admin ON public.storage_providers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ai_endpoints: admin only
DROP POLICY IF EXISTS endpoints_select_authenticated ON public.ai_endpoints;
DROP POLICY IF EXISTS endpoints_select_admin ON public.ai_endpoints;
CREATE POLICY endpoints_select_admin ON public.ai_endpoints
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- storage.objects: admin-only policies for whatsapp-media bucket
DROP POLICY IF EXISTS whatsapp_media_admin_select ON storage.objects;
DROP POLICY IF EXISTS whatsapp_media_admin_insert ON storage.objects;
DROP POLICY IF EXISTS whatsapp_media_admin_update ON storage.objects;
DROP POLICY IF EXISTS whatsapp_media_admin_delete ON storage.objects;

CREATE POLICY whatsapp_media_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY whatsapp_media_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY whatsapp_media_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY whatsapp_media_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.has_role(auth.uid(), 'admin'));
