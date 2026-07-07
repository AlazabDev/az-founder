
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select_admin ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "agents readable by authenticated" ON public.ai_agents;
DROP POLICY IF EXISTS agents_select_authenticated ON public.ai_agents;
CREATE POLICY agents_select_admin ON public.ai_agents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS policies_select_authenticated ON public.apim_policies;
CREATE POLICY policies_select_admin ON public.apim_policies
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pricing_select_auth ON public.model_pricing;
CREATE POLICY pricing_select_admin ON public.model_pricing
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS storage_select_auth ON public.storage_providers;
CREATE POLICY storage_select_admin ON public.storage_providers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS endpoints_select_authenticated ON public.ai_endpoints;
