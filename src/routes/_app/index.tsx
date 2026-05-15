import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";

import { PageHeader, StatCard, EmptyState } from "@/components/console/PageHeader";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

interface OverviewResponse {
  requestsToday?: number;
  filesUploaded?: number;
  filesAnalyzed?: number;
  imagesAnalyzed?: number;
  pdfsAnalyzed?: number;
  spreadsheetsAnalyzed?: number;
  activeJobs?: number;
  failedJobs?: number;
  knowledgeSources?: number;
  indexedDocuments?: number;
  organizationCompletion?: number;
  avgLatencyMs?: number;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  recentActivity?: Array<{ id: string; title: string; at: string; type: string }>;
  recentErrors?: Array<{ id: string; message: string; at: string; service: string }>;
  servicesHealth?: Array<{ name: string; status: "ok" | "warn" | "err" }>;
}

function fmt(n: number | undefined, suffix = "") {
  if (n === undefined || n === null) return "—";
  return `${n.toLocaleString("en-US")}${suffix}`;
}

function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api<OverviewResponse>("/api/analytics/overview"),
    retry: 0,
  });

  const empty = !data && !isLoading;

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        description="نظرة تنفيذية فورية على حالة منصة الذكاء الاصطناعي وأنشطة المعالجة."
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card p-12 text-muted-foreground">
          <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="تعذّر تحميل بيانات اللوحة"
          description={(error as Error).message}
        />
      ) : empty ? (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title="لا توجد بيانات بعد"
          description="ستظهر مؤشرات التشغيل بمجرد بدء استخدام المنصة وفهرسة البيانات."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <StatCard
              label="طلبات اليوم"
              value={fmt(data?.requestsToday)}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              label="ملفات مرفوعة"
              value={fmt(data?.filesUploaded)}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="ملفات محللة"
              value={fmt(data?.filesAnalyzed)}
              icon={<Layers className="h-4 w-4" />}
            />
            <StatCard
              label="صور محللة"
              value={fmt(data?.imagesAnalyzed)}
              icon={<ImageIcon className="h-4 w-4" />}
            />
            <StatCard
              label="ملفات PDF"
              value={fmt(data?.pdfsAnalyzed)}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="جداول Excel/CSV"
              value={fmt(data?.spreadsheetsAnalyzed)}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="وظائف نشطة"
              value={fmt(data?.activeJobs)}
              icon={<Activity className="h-4 w-4" />}
            />
            <StatCard
              label="وظائف فاشلة"
              value={fmt(data?.failedJobs)}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <StatCard
              label="مصادر المعرفة"
              value={fmt(data?.knowledgeSources)}
              icon={<Database className="h-4 w-4" />}
            />
            <StatCard
              label="مستندات مفهرسة"
              value={fmt(data?.indexedDocuments)}
              icon={<Database className="h-4 w-4" />}
            />
            <StatCard
              label="متوسط الاستجابة"
              value={fmt(data?.avgLatencyMs, " ms")}
              icon={<Timer className="h-4 w-4" />}
            />
            <StatCard
              label="التكلفة التقديرية"
              value={fmt(data?.estimatedCostUsd, " $")}
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 lg:col-span-1">
              <h3 className="mb-3 text-sm font-semibold">حالة الخدمات</h3>
              <ul className="space-y-2 text-sm">
                {(data?.servicesHealth ?? []).length === 0 ? (
                  <li className="text-muted-foreground">لا توجد بيانات حالة بعد.</li>
                ) : (
                  data!.servicesHealth!.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                    >
                      <span>{s.name}</span>
                      <span
                        className={`status-dot ${
                          s.status === "ok"
                            ? "status-dot--ok"
                            : s.status === "warn"
                              ? "status-dot--warn"
                              : "status-dot--err"
                        }`}
                      />
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-lg border bg-card p-4 lg:col-span-1">
              <h3 className="mb-3 text-sm font-semibold">آخر الأنشطة</h3>
              {(data?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد أنشطة بعد.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data!.recentActivity!.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <div className="min-w-0">
                        <div className="truncate">{a.title}</div>
                        <div className="num text-xs text-muted-foreground">{a.at}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4 lg:col-span-1">
              <h3 className="mb-3 text-sm font-semibold">آخر الأخطاء</h3>
              {(data?.recentErrors ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد أخطاء.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data!.recentErrors!.map((e) => (
                    <li key={e.id} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div className="min-w-0">
                        <div className="truncate">{e.message}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="num">{e.at}</span> · {e.service}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
