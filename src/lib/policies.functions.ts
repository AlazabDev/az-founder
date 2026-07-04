/**
 * Admin CRUD for apim_policies.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apim_policies")
      .select("*, ai_endpoints(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const policySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  policy_type: z.enum(["rate_limit", "quota", "content_filter", "cost_cap", "circuit_breaker"]),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
  applies_to_endpoint_id: z.string().uuid().nullable().optional(),
});

export const upsertPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => policySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const row = { ...data, config: data.config as never };
    if (data.id) {
      const { error } = await context.supabase
        .from("apim_policies")
        .update(row)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("apim_policies")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id };
  });

export const deletePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("apim_policies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
