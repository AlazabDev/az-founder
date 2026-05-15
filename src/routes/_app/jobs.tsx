import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Loader2, RefreshCw } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_app/jobs")({
  component: JobsPage,
});

interface Job {
  id: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress: number;
  createdAt: string;
  durationMs?: number;
  errorMessage?: string;
}

function statusBadge(s: Job["status"]) {
  const map: Record<Job["status"], { cls: string; label: string }> = {
    queued: { cls: "bg-muted text-muted-foreground", label: "في الانتظار" },
    running: { cls: "bg-primary/15 text-primary", label: "قيد التشغيل" },
    succeeded: { cls: "bg-success/20 text-success", label: "نجح" },
    failed: { cls: "bg-destructive/20 text-destructive", label: "فشل" },
    cancelled: { cls: "bg-muted text-muted-foreground", label: "أُلغي" },
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${map[s].cls}`}>
      {map[s].label}
    </span>
  );
}

function JobsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<Job[]>("/api/jobs"),
    retry: 0,
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api(`/api/jobs/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      toast.success("تمت إعادة المحاولة");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الطلب"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api(`/api/jobs/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("تم الإلغاء");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الإلغاء"),
  });

  return (
    <div>
      <PageHeader
        title="مراقبة الوظائف"
        description="متابعة كل العمليات الخلفية: استيعاب المستندات، تحليل الصور و PDF، الفهرسة، استدعاءات المحادثة، والتزامن."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
          <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : error ? (
        <EmptyState title="تعذّر تحميل الوظائف" description={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title="لا توجد وظائف بعد"
          description="ستظهر الوظائف الخلفية هنا فور بدء أي عملية معالجة في الباك اند."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right">المعرّف</th>
                <th className="px-4 py-3 text-right">النوع</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right w-40">التقدم</th>
                <th className="px-4 py-3 text-right">المدة</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((j) => (
                <tr key={j.id} className="border-t align-top">
                  <td className="px-4 py-3 num text-xs text-muted-foreground">{j.id}</td>
                  <td className="px-4 py-3 text-xs">{j.type}</td>
                  <td className="px-4 py-3">
                    {statusBadge(j.status)}
                    {j.errorMessage && (
                      <div className="mt-1 text-xs text-destructive">{j.errorMessage}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Progress value={j.progress} className="h-2" />
                    <div className="mt-1 num text-xs text-muted-foreground">{j.progress}%</div>
                  </td>
                  <td className="px-4 py-3 num text-xs">
                    {j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {j.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(j.id)}
                        >
                          إعادة محاولة
                        </Button>
                      )}
                      {(j.status === "queued" || j.status === "running") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelMutation.mutate(j.id)}
                        >
                          إلغاء
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
