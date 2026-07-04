/**
 * Usage/analytics queries for AI Gateway dashboard.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getUsageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await context.supabase
      .from("ai_usage_logs")
      .select("created_at, total_tokens, total_cost_usd, latency_ms, status, model")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    const rows = data ?? [];
    const totalCost = rows.reduce((s, r) => s + Number(r.total_cost_usd ?? 0), 0);
    const totalTokens = rows.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);
    const errors = rows.filter((r) => r.status === "error").length;
    const blocked = rows.filter((r) => r.status === "blocked").length;
    const rateLimited = rows.filter((r) => r.status === "rate_limited").length;
    const avgLatency =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((s, r) => s + Number(r.latency_ms ?? 0), 0) / rows.length);

    // by-day series
    const byDay = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const r of rows) {
      const d = (r.created_at ?? "").slice(0, 10);
      const cur = byDay.get(d) ?? { requests: 0, tokens: 0, cost: 0 };
      cur.requests += 1;
      cur.tokens += Number(r.total_tokens ?? 0);
      cur.cost += Number(r.total_cost_usd ?? 0);
      byDay.set(d, cur);
    }
    const series = Array.from(byDay.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return {
      totals: {
        requests: rows.length,
        totalTokens,
        totalCost: Number(totalCost.toFixed(4)),
        errors,
        blocked,
        rateLimited,
        avgLatency,
      },
      series,
    };
  });

export const listRecentLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });
