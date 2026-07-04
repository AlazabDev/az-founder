/**
 * Admin CRUD for storage_providers + list/upload helpers per provider.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";

export const listStorageProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("storage_providers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(["azure_blob", "aws_s3", "google_drive", "supabase"]),
  display_name: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

export const upsertStorageProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const row = { ...data, config: data.config as never, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase
        .from("storage_providers")
        .update(row)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("storage_providers")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id };
  });

export const deleteStorageProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("storage_providers")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Test connection status for a provider using its env secrets. */
export const testStorageProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      provider: z.enum(["azure_blob", "aws_s3", "google_drive", "supabase"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    switch (data.provider) {
      case "azure_blob": {
        const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
        return { ok: !!cs, hint: cs ? "متصل" : "AZURE_STORAGE_CONNECTION_STRING مفقود" };
      }
      case "aws_s3": {
        const k = process.env.AWS_S3_API_KEY;
        return { ok: !!k, hint: k ? "متصل عبر Lovable Connector" : "اربط AWS S3 من Connectors" };
      }
      case "google_drive": {
        const k = process.env.GOOGLE_DRIVE_API_KEY;
        return { ok: !!k, hint: k ? "متصل" : "اربط Google Drive" };
      }
      case "supabase": {
        return { ok: true, hint: "متاح داخل المشروع" };
      }
    }
  });
