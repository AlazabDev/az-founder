import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2 } from "lucide-react";

import { PageHeader, EmptyState, StatCard } from "@/components/console/PageHeader";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

interface Analytics {
  requestsTotal?: number;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  avgLatencyMs?: number;
  successRate?: number;
  failureRate?: number;
  filesAnalyzed?: number;
  topPrompts?: Array<{ name: string; count: number }>;
  topBrands?: Array<{ name: string; count: number }>;
  topSources?: Array<{ name: string; count: number }>;
  errorsByService?: Array<{ service: string; count: number }>;
}

function fmt(n?: number, suffix = "") {
  if (n === undefined || n === null) return "—";
  return `${n.toLocaleString("en-US")}${suffix}`;
}

function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api<Analytics>("/api/analytics/overview"),
    retry: 0,
  });

  return (
    <div>
      <PageHeader
        title="التحليلات"
        description="مؤشرات استخدام المنصة، التكلفة، الأخطاء، وأكثر العناصر نشاطًا."
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
          <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : error ? (
        <EmptyState title="تعذّر تحميل التحليلات" description={(error as Error).message} />
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="لا توجد بيانات بعد"
          description="ستظهر مؤشرات الأداء بمجرد بدء استخدام المنصة."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <StatCard label="إجمالي الطلبات" value={fmt(data.requestsTotal)} />
            <StatCard label="التوكنات المستخدمة" value={fmt(data.tokensUsed)} />
            <StatCard label="التكلفة التقديرية" value={fmt(data.estimatedCostUsd, " $")} />
            <StatCard label="متوسط الاستجابة" value={fmt(data.avgLatencyMs, " ms")} />
            <StatCard label="نسبة النجاح" value={fmt(data.successRate, " %")} />
            <StatCard label="نسبة الفشل" value={fmt(data.failureRate, " %")} />
            <StatCard label="ملفات محللة" value={fmt(data.filesAnalyzed)} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ListBox title="أكثر البرومبتات استخدامًا" items={data.topPrompts} />
            <ListBox title="أكثر العلامات نشاطًا" items={data.topBrands} />
            <ListBox title="أعلى مصادر المعرفة" items={data.topSources} />
            <ListBox
              title="الأخطاء حسب الخدمة"
              items={data.errorsByService?.map((e) => ({
                name: e.service,
                count: e.count,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ListBox({
  title,
  items,
}: {
  title: string;
  items?: Array<{ name: string; count: number }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {!items || items.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
            >
              <span className="truncate">{it.name}</span>
              <span className="num text-muted-foreground">
                {it.count.toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
