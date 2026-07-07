/**
 * Admin server functions for app_settings — sensitive runtime config
 * (e.g. Ollama credentials) stored in the database, never in browser storage.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const OLLAMA_KEYS = ["ollama_url", "ollama_user", "ollama_pass"] as const;
type OllamaKey = (typeof OLLAMA_KEYS)[number];

export interface OllamaSettings {
  ollama_url: string;
  ollama_user: string;
  /** Whether a password value is set. Real value is never returned to the client. */
  ollama_pass_set: boolean;
}

export const getOllamaSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OllamaSettings> => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("key,value")
      .in("key", OLLAMA_KEYS as unknown as string[]);
    if (error) throw error;
    const map = new Map<string, string | null>((data ?? []).map((r) => [r.key, r.value]));
    return {
      ollama_url: map.get("ollama_url") ?? process.env.OLLAMA_URL ?? "https://ollama.alazab.cloud",
      ollama_user: map.get("ollama_user") ?? process.env.OLLAMA_USER ?? "azureuser",
      ollama_pass_set: Boolean(map.get("ollama_pass")) || Boolean(process.env.OLLAMA_PASS),
    };
  });

const saveSchema = z.object({
  ollama_url: z.string().url().max(500),
  ollama_user: z.string().min(1).max(200),
  /** If empty/undefined, existing password is preserved. */
  ollama_pass: z.string().max(500).optional().nullable(),
  /** If true, delete the stored password entirely. */
  clear_password: z.boolean().default(false),
});

export const saveOllamaSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const now = new Date().toISOString();
    const rows: Array<{ key: OllamaKey; value: string | null; updated_at: string; updated_by: string }> = [
      { key: "ollama_url", value: data.ollama_url, updated_at: now, updated_by: context.userId },
      { key: "ollama_user", value: data.ollama_user, updated_at: now, updated_by: context.userId },
    ];
    if (data.clear_password) {
      rows.push({ key: "ollama_pass", value: null, updated_at: now, updated_by: context.userId });
    } else if (data.ollama_pass && data.ollama_pass.length > 0) {
      rows.push({ key: "ollama_pass", value: data.ollama_pass, updated_at: now, updated_by: context.userId });
    }
    const { error } = await context.supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) throw error;
    // Invalidate in-process cache so the next call picks up the new values.
    const { invalidateOllamaConfig } = await import("@/lib/ai-gateway.server");
    invalidateOllamaConfig();
    return { ok: true };
  });

export interface CatalogItem {
  id: string;
  name: string;
  provider: string;
  model: string;
  deployment_name: string | null;
  base_url: string | null;
  endpoint_url: string;
  enabled: boolean;
  is_default: boolean;
  last_status: string | null;
  last_latency_ms: number | null;
  last_checked_at: string | null;
}

function computeEndpointUrl(row: {
  provider: string;
  base_url: string | null;
  deployment_name: string | null;
  model: string;
  api_version: string | null;
  use_apim: boolean;
}, ollamaUrl: string): string {
  const dep = row.deployment_name ?? row.model;
  if (row.provider === "ollama") {
    const base = (row.base_url ?? ollamaUrl).replace(/\/$/, "");
    return `${base}/v1/chat/completions`;
  }
  if (row.provider === "openai") {
    const base = (row.base_url ?? "https://api.openai.com").replace(/\/$/, "");
    return `${base}/v1/chat/completions`;
  }
  if (row.provider === "lovable") {
    return "https://ai.gateway.lovable.dev/v1/chat/completions";
  }
  // azure_openai / apim / foundry all follow the Azure deployment URL shape
  const base = (row.base_url ?? "").replace(/\/$/, "");
  const version = row.api_version ?? "2024-10-21";
  return `${base}/openai/deployments/${dep}/chat/completions?api-version=${version}`;
}

/** Public-catalog view of endpoints for any authenticated user — no secrets. */
export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogItem[]> => {
    const { data, error } = await context.supabase
      .from("ai_endpoints")
      .select(
        "id,name,provider,model,deployment_name,base_url,api_version,use_apim,enabled,is_default,last_status,last_latency_ms,last_checked_at",
      )
      .order("provider", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    // Resolve stored ollama URL (fallback to env) once, without exposing credentials.
    let ollamaUrl = process.env.OLLAMA_URL ?? "https://ollama.alazab.cloud";
    const { data: setting } = await context.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ollama_url")
      .maybeSingle();
    if (setting?.value) ollamaUrl = setting.value;

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      model: row.model,
      deployment_name: row.deployment_name,
      base_url: row.base_url,
      endpoint_url: computeEndpointUrl(
        {
          provider: row.provider,
          base_url: row.base_url,
          deployment_name: row.deployment_name,
          model: row.model,
          api_version: row.api_version,
          use_apim: row.use_apim,
        },
        ollamaUrl,
      ),
      enabled: row.enabled,
      is_default: row.is_default,
      last_status: row.last_status,
      last_latency_ms: row.last_latency_ms,
      last_checked_at: row.last_checked_at,
    }));
  });
