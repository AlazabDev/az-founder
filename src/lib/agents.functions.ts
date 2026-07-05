/**
 * Admin CRUD for ai_agents.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_agents")
      .select("*, ai_endpoints(name, model)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const agentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  display_name: z.string().max(150).nullable().optional(),
  kind: z.enum(["copilot", "core", "prod", "maint", "finance", "custom"]),
  version: z.string().max(50).nullable().optional(),
  endpoint_id: z.string().uuid().nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  system_prompt: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
});

export const upsertAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => agentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("ai_agents").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("ai_agents")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ai_agents").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
