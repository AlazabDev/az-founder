import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/console/PageHeader";
import { Badge } from "@/components/ui/badge";
import { listRecentLogs } from "@/lib/usage.functions";

export const Route = createFileRoute("/_app/ai-gateway/logs")({
  component: LogsPage,
});

function statusBadge(s: string) {
  const cls: Record<string, string> = {
    success: "border-green-500/40 text-green-600",
    error: "border-red-500/40 text-red-600",
    blocked: "border-amber-500/40 text-amber-600",
    rate_limited: "border-orange-500/40 text-orange-600",
  };
  return <Badge variant="outline" className={cls[s] ?? ""}>{s}</Badge>;
}

function LogsPage() {
  const f = useServerFn(listRecentLogs);
  const q = useQuery({ queryKey: ["logs"], queryFn: f, refetchInterval: 10_000 });

  return (
    <div>
      <PageHeader
        title="سجل الاستخدام"
        description="آخر 200 استدعاء عبر AI Gateway. يتحدّث تلقائياً كل 10 ثوانٍ."
      />

      <div className="rounded-lg border bg-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-muted/50 text-right text-xs text-muted-foreground">
              <tr>
                <th className="p-3">الوقت</th>
                <th className="p-3">الموديل</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">$</th>
                <th className="p-3">Latency</th>
                <th className="p-3">خطأ</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap font-mono text-xs">
                    {new Date(r.created_at).toLocaleString("ar")}
                  </td>
                  <td className="p-3 font-mono text-xs">{r.model}</td>
                  <td className="p-3">{statusBadge(r.status)}</td>
                  <td className="p-3 font-mono text-xs">{r.total_tokens}</td>
                  <td className="p-3 font-mono text-xs">${Number(r.total_cost_usd).toFixed(5)}</td>
                  <td className="p-3 font-mono text-xs">{r.latency_ms}ms</td>
                  <td className="p-3 max-w-md truncate text-xs text-muted-foreground">{r.error ?? "-"}</td>
                </tr>
              ))}
              {q.data?.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد سجلات بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
