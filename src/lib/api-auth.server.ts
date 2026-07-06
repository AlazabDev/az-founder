/**
 * Server-side auth for /api/* raw HTTP routes.
 * Validates the Supabase bearer token; throws a 401 Response on failure.
 */
import { createMiddleware } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function unauthorized(msg = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function forbidden(msg = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

async function verifyBearer(request: Request): Promise<
  | { ok: true; userId: string; token: string; supabase: ReturnType<typeof createClient> }
  | { ok: false; response: Response }
> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false, response: unauthorized("Missing bearer token") };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, response: unauthorized("Auth misconfigured") };

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) return { ok: false, response: unauthorized("Invalid token") };
  return { ok: true, userId: sub as string, token, supabase };
}

/**
 * Server route middleware — enforces authentication on every request.
 * Throws a 401 Response (TanStack propagates thrown Response as-is).
 */
export const requireApiAuth = createMiddleware().server(async ({ next, request }) => {
  const r = await verifyBearer(request);
  if (!r.ok) throw r.response;
  return next({ context: { userId: r.userId, token: r.token, supabase: r.supabase } });
});

/**
 * Server route middleware — enforces authentication + admin role.
 */
export const requireApiAdmin = createMiddleware().server(async ({ next, request }) => {
  const r = await verifyBearer(request);
  if (!r.ok) throw r.response;
  const { data } = await r.supabase.rpc("has_role", { _user_id: r.userId, _role: "admin" });
  if (!data) throw forbidden("Admin only");
  return next({ context: { userId: r.userId, token: r.token, supabase: r.supabase } });
});
