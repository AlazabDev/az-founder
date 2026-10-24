-- Ollama server moved from ollama.alazab.cloud to ollama.alazab.com
-- Store the new URL/user as the single source of truth in app_settings
-- (password is entered by an admin via the Ollama settings page, never in code).
INSERT INTO public.app_settings (key, value, updated_at, updated_by)
VALUES
  ('ollama_url', 'https://ollama.alazab.com', now(), NULL),
  ('ollama_user', 'azureuser', now(), NULL)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

-- Ollama endpoints inherit the URL from app_settings (single source of truth)
UPDATE public.ai_endpoints SET base_url = NULL WHERE provider = 'ollama';

-- Register Ollama models present on the server but missing from the catalog
INSERT INTO public.ai_endpoints (name, provider, model, enabled)
SELECT v.name, 'ollama', v.model, true
FROM (VALUES
  ('ol-gemma4-31b',        'gemma4:31b'),
  ('ol-gpt-oss-20b',       'gpt-oss:20b'),
  ('ol-qwen3-vl-32b',      'mirage335/Qwen-3-VL-32B-virtuoso:latest'),
  ('ol-deepseek-r1-14b',   'deepseek-r1:14b'),
  ('ol-qwen3-6-27b',       'qwen3.6:27b')
) AS v(name, model)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_endpoints e
  WHERE e.provider = 'ollama' AND e.model = v.model
);