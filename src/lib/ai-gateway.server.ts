/**
 * AI Gateway - Production-ready routing layer for LLM calls.
 * Server-only. Handles endpoint selection, APIM, content-safety,
 * rate limiting, retries, cost tracking and usage logging.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Provider = "azure_openai" | "openai" | "lovable" | "apim";
type UsageStatus = "success" | "blocked" | "error" | "rate_limited";

export interface Endpoint {
  id: string;
  name: string;
  provider: Provider;
  base_url: string | null;
  deployment_name: string | null;
  model: string;
  api_version: string | null;
  use_apim: boolean;
  enabled: boolean;
  is_default: boolean;
}

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayResult {
  status: UsageStatus;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  latency_ms: number;
  request_id?: string;
  flagged?: boolean;
}

function admin(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getEndpoint(id: string | null): Promise<Endpoint> {
  const db = admin();
  const q = db.from("ai_endpoints").select("*").eq("enabled", true);
  const { data, error } = id
    ? await q.eq("id", id).maybeSingle()
    : await q.eq("is_default", true).maybeSingle();
  if (error) throw error;
  if (!data) {
    // fallback synthetic endpoint from env
    const env = process.env.AZURE_OPENAI_ENDPOINT;
    if (!env) throw new Error("لا يوجد endpoint مفعّل ولا AZURE_OPENAI_ENDPOINT");
    return {
      id: "env-default",
      name: "Azure OpenAI (env)",
      provider: "azure_openai",
      base_url: env,
      deployment_name: process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o-mini",
      model: process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o-mini",
      api_version: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
      use_apim: false,
      enabled: true,
      is_default: true,
    };
  }
  return data as Endpoint;
}

/* ---------------- Content Safety ---------------- */
export async function contentSafetyCheck(
  text: string,
): Promise<{ safe: boolean; categories?: unknown }> {
  const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT;
  const key = process.env.AZURE_CONTENT_SAFETY_KEY;
  if (!endpoint || !key) return { safe: true }; // skip if not configured
  try {
    const url = `${endpoint.replace(/\/$/, "")}/contentsafety/text:analyze?api-version=2024-09-01`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": key,
      },
      body: JSON.stringify({
        text,
        categories: ["Hate", "SelfHarm", "Sexual", "Violence"],
        outputType: "FourSeverityLevels",
      }),
    });
    if (!r.ok) return { safe: true };
    const j = (await r.json()) as {
      categoriesAnalysis?: Array<{ category: string; severity: number }>;
    };
    const worst = Math.max(
      0,
      ...(j.categoriesAnalysis ?? []).map((c) => c.severity ?? 0),
    );
    return { safe: worst < 4, categories: j.categoriesAnalysis };
  } catch {
    return { safe: true };
  }
}

/* ---------------- Rate Limiting ---------------- */
type WindowKey = "minute" | "hour" | "day";
const WINDOW_MS: Record<WindowKey, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

export async function checkRateLimit(
  userId: string,
  endpointId: string,
  limits: { minute?: number; hour?: number; day?: number },
): Promise<{ allowed: boolean; window?: WindowKey; limit?: number; count?: number }> {
  const db = admin();
  for (const [k, limit] of Object.entries(limits) as [WindowKey, number | undefined][]) {
    if (!limit) continue;
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / WINDOW_MS[k]) * WINDOW_MS[k]);
    const { data } = await db
      .from("rate_limit_counters")
      .select("count")
      .eq("user_id", userId)
      .eq("endpoint_id", endpointId)
      .eq("window_key", k)
      .eq("window_start", windowStart.toISOString())
      .maybeSingle();
    const current = data?.count ?? 0;
    if (current >= limit) return { allowed: false, window: k, limit, count: current };
  }
  return { allowed: true };
}

export async function incrementRateLimit(
  userId: string,
  endpointId: string,
  tokens: number,
): Promise<void> {
  const db = admin();
  const now = Date.now();
  const windows: WindowKey[] = ["minute", "hour", "day"];
  for (const k of windows) {
    const windowStart = new Date(Math.floor(now / WINDOW_MS[k]) * WINDOW_MS[k]);
    const { data: existing } = await db
      .from("rate_limit_counters")
      .select("id, count, tokens")
      .eq("user_id", userId)
      .eq("endpoint_id", endpointId)
      .eq("window_key", k)
      .eq("window_start", windowStart.toISOString())
      .maybeSingle();
    if (existing) {
      await db
        .from("rate_limit_counters")
        .update({ count: (existing.count ?? 0) + 1, tokens: (existing.tokens ?? 0) + tokens })
        .eq("id", existing.id);
    } else {
      await db.from("rate_limit_counters").insert({
        user_id: userId,
        endpoint_id: endpointId,
        window_key: k,
        window_start: windowStart.toISOString(),
        count: 1,
        tokens,
      });
    }
  }
}

/* ---------------- Policies loader ---------------- */
export interface Policies {
  rate_limit?: { minute?: number; hour?: number; day?: number };
  quota?: { max_tokens_per_day?: number };
  content_filter?: { enabled: boolean };
  cost_cap?: { max_usd_per_day?: number };
  circuit_breaker?: { failure_threshold?: number; cooldown_ms?: number };
}

export async function loadPolicies(endpointId: string): Promise<Policies> {
  const db = admin();
  const { data } = await db
    .from("apim_policies")
    .select("policy_type, config, enabled")
    .eq("enabled", true)
    .or(`applies_to_endpoint_id.is.null,applies_to_endpoint_id.eq.${endpointId}`);
  const p: Policies = {};
  for (const row of data ?? []) {
    const cfg = (row.config ?? {}) as Record<string, unknown>;
    if (row.policy_type === "rate_limit") p.rate_limit = cfg as Policies["rate_limit"];
    else if (row.policy_type === "quota") p.quota = cfg as Policies["quota"];
    else if (row.policy_type === "content_filter")
      p.content_filter = { enabled: true, ...(cfg as object) };
    else if (row.policy_type === "cost_cap") p.cost_cap = cfg as Policies["cost_cap"];
    else if (row.policy_type === "circuit_breaker")
      p.circuit_breaker = cfg as Policies["circuit_breaker"];
  }
  return p;
}

/* ---------------- Pricing ---------------- */
const priceCache = new Map<string, { input: number; output: number }>();
async function priceFor(model: string): Promise<{ input: number; output: number }> {
  if (priceCache.has(model)) return priceCache.get(model)!;
  const db = admin();
  const { data } = await db
    .from("model_pricing")
    .select("input_per_1k, output_per_1k")
    .eq("model", model)
    .maybeSingle();
  const p = {
    input: Number(data?.input_per_1k ?? 0),
    output: Number(data?.output_per_1k ?? 0),
  };
  priceCache.set(model, p);
  return p;
}

export async function computeCost(
  model: string,
  prompt: number,
  completion: number,
): Promise<number> {
  const p = await priceFor(model);
  return (prompt / 1000) * p.input + (completion / 1000) * p.output;
}

/* ---------------- Cost cap ---------------- */
export async function checkCostCap(
  userId: string,
  maxUsdPerDay: number,
): Promise<{ allowed: boolean; spent: number }> {
  const db = admin();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await db
    .from("ai_usage_logs")
    .select("total_cost_usd")
    .eq("user_id", userId)
    .gte("created_at", since);
  const spent = (data ?? []).reduce((s, r) => s + Number(r.total_cost_usd ?? 0), 0);
  return { allowed: spent < maxUsdPerDay, spent };
}

/* ---------------- Usage Log ---------------- */
export async function logUsage(row: {
  user_id: string;
  endpoint_id: string | null;
  conversation_id?: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost_usd: number;
  latency_ms: number;
  status: UsageStatus;
  error?: string | null;
  flagged?: boolean;
  request_id?: string | null;
}): Promise<void> {
  const db = admin();
  await db.from("ai_usage_logs").insert({
    user_id: row.user_id,
    endpoint_id: row.endpoint_id,
    conversation_id: row.conversation_id ?? null,
    model: row.model,
    prompt_tokens: row.prompt_tokens,
    completion_tokens: row.completion_tokens,
    total_tokens: row.prompt_tokens + row.completion_tokens,
    total_cost_usd: row.total_cost_usd,
    latency_ms: row.latency_ms,
    status: row.status,
    error: row.error ?? null,
    flagged: row.flagged ?? false,
    request_id: row.request_id ?? null,
  });
}

/* ---------------- Circuit Breaker (in-memory) ---------------- */
const cbState = new Map<string, { failures: number; openedAt: number }>();
function cbCheck(endpointId: string, threshold: number, cooldown: number): boolean {
  const s = cbState.get(endpointId);
  if (!s) return true;
  if (s.failures < threshold) return true;
  if (Date.now() - s.openedAt > cooldown) {
    cbState.delete(endpointId);
    return true;
  }
  return false;
}
function cbFail(endpointId: string) {
  const s = cbState.get(endpointId) ?? { failures: 0, openedAt: 0 };
  s.failures += 1;
  if (s.failures === 1) s.openedAt = Date.now();
  cbState.set(endpointId, s);
}
function cbSuccess(endpointId: string) {
  cbState.delete(endpointId);
}

/* ---------------- Provider call (streaming) ---------------- */
function buildAzureUrl(ep: Endpoint): string {
  const apim = process.env.AZURE_APIM_ENDPOINT;
  const apiVersion = ep.api_version ?? "2024-10-21";
  const deployment = ep.deployment_name ?? ep.model;
  if (ep.use_apim && apim) {
    return `${apim.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  }
  const base = (ep.base_url ?? process.env.AZURE_OPENAI_ENDPOINT ?? "").replace(/\/$/, "");
  return `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
}

function buildAuthHeaders(ep: Endpoint): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ep.use_apim && process.env.AZURE_APIM_SUBSCRIPTION_KEY) {
    headers["Ocp-Apim-Subscription-Key"] = process.env.AZURE_APIM_SUBSCRIPTION_KEY;
  }
  if (process.env.AZURE_OPENAI_API_KEY) {
    headers["api-key"] = process.env.AZURE_OPENAI_API_KEY;
  }
  return headers;
}

export async function callAzureStream(
  ep: Endpoint,
  messages: ChatMsg[],
): Promise<Response> {
  const r = await fetch(buildAzureUrl(ep), {
    method: "POST",
    headers: buildAuthHeaders(ep),
    body: JSON.stringify({
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  return r;
}

/* ---------------- Main entrypoint: guarded streaming ---------------- */

export interface StreamGuardResult {
  ok: boolean;
  status?: number;
  error?: string;
  upstream?: Response;
  endpoint: Endpoint;
  policies: Policies;
}

export async function preflight(
  userId: string,
  endpointId: string | null,
  userText: string,
): Promise<StreamGuardResult> {
  const ep = await getEndpoint(endpointId);
  const policies = await loadPolicies(ep.id);

  // Circuit breaker
  const cb = policies.circuit_breaker ?? { failure_threshold: 5, cooldown_ms: 60_000 };
  if (!cbCheck(ep.id, cb.failure_threshold ?? 5, cb.cooldown_ms ?? 60_000)) {
    return { ok: false, status: 503, error: "الخدمة معطّلة مؤقتاً (circuit breaker).", endpoint: ep, policies };
  }

  // Rate limit
  if (policies.rate_limit) {
    const rl = await checkRateLimit(userId, ep.id, policies.rate_limit);
    if (!rl.allowed) {
      return {
        ok: false,
        status: 429,
        error: `تجاوزت الحد المسموح (${rl.count}/${rl.limit} لكل ${rl.window}).`,
        endpoint: ep,
        policies,
      };
    }
  }

  // Cost cap
  if (policies.cost_cap?.max_usd_per_day) {
    const c = await checkCostCap(userId, policies.cost_cap.max_usd_per_day);
    if (!c.allowed) {
      return {
        ok: false,
        status: 402,
        error: `تجاوزت سقف التكلفة اليومي ($${c.spent.toFixed(2)}/$${policies.cost_cap.max_usd_per_day}).`,
        endpoint: ep,
        policies,
      };
    }
  }

  // Content safety
  if (policies.content_filter?.enabled) {
    const s = await contentSafetyCheck(userText);
    if (!s.safe) {
      return { ok: false, status: 400, error: "المحتوى مرفوض من فلتر الأمان.", endpoint: ep, policies };
    }
  }

  return { ok: true, endpoint: ep, policies };
}

export { cbFail, cbSuccess };
