/**
 * Admin CRUD for ai_endpoints + connection tester.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const listEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_endpoints")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const endpointSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  provider: z.enum(["azure_openai", "openai", "lovable", "apim"]),
  base_url: z.string().url().nullable().optional().or(z.literal("")),
  deployment_name: z.string().max(100).nullable().optional(),
  model: z.string().min(1).max(100),
  api_version: z.string().max(50).nullable().optional(),
  use_apim: z.boolean().default(false),
  is_default: z.boolean().default(false),
  enabled: z.boolean().default(true),
  api_key: z.string().nullable().optional(),
  extra_headers: z.record(z.string(), z.string()).nullable().optional(),
});

export const upsertEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => endpointSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase
        .from("ai_endpoints")
        .update(payload)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("ai_endpoints")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ai_endpoints").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

async function pingEndpoint(id: string) {
  const { getEndpoint, callAzureStream } = await import("@/lib/ai-gateway.server");
  const ep = await getEndpoint(id);
  const started = Date.now();
  try {
    const r = await callAzureStream(ep, [{ role: "user", content: "ping" }]);
    const latency = Date.now() - started;
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { ok: false, status: r.status, latency_ms: latency, error: t.slice(0, 500) };
    }
    const reader = r.body!.getReader();
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value?.byteLength ?? 0;
      if (bytes > 4096) break;
    }
    await reader.cancel();
    return { ok: true, status: r.status, latency_ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), latency_ms: Date.now() - started };
  }
}

export const testEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const res = await pingEndpoint(data.id);
    await context.supabase
      .from("ai_endpoints")
      .update({
        last_status: res.ok ? "ok" : "error",
        last_latency_ms: res.latency_ms ?? null,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return res;
  });

export const testAllEndpoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("ai_endpoints")
      .select("id")
      .eq("enabled", true);
    const results = await Promise.all(
      (rows ?? []).map(async (r) => {
        const res = await pingEndpoint(r.id);
        await context.supabase
          .from("ai_endpoints")
          .update({
            last_status: res.ok ? "ok" : "error",
            last_latency_ms: res.latency_ms ?? null,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        return { id: r.id, ...res };
      }),
    );
    return results;
  });

