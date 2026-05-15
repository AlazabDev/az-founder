import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Loader2, RefreshCw } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_app/tools")({
  component: ToolsPage,
});

interface Tool {
  id: string;
  name: string;
  description?: string;
  status: "ok" | "warn" | "err" | "idle";
  endpoint?: string;
  lastCheckedAt?: string;
}

function statusDot(s: Tool["status"]) {
  return s === "ok"
    ? "status-dot--ok"
    : s === "warn"
      ? "status-dot--warn"
      : s === "err"
        ? "status-dot--err"
        : "status-dot--idle";
}

function ToolsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["tools"],
    queryFn: () => api<Tool[]>("/api/tools"),
    retry: 0,
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api(`/api/tools/${id}/test`, { method: "POST" }),
    onSuccess: () => {
      toast.success("اختبار ناجح");
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "اختبار فاشل"),
  });

  return (
    <div>
      <PageHeader
        title="سجل أدوات الذكاء الاصطناعي"
        description="حالة الخدمات والأدوات المتصلة بالباك اند: Azure OpenAI, AI Search, Document Intelligence, Vision, Speech, Storage، وغيرها."
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
        <EmptyState title="تعذّر تحميل الأدوات" description={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-5 w-5" />}
          title="لا توجد أدوات مُسجَّلة بعد"
          description="بعد إعداد الربط ستظهر الأدوات والخدمات هنا مع حالة كل منها."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <div key={t.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${statusDot(t.status)}`} />
                    <span className="truncate font-medium">{t.name}</span>
                  </div>
                  {t.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                  )}
                  {t.endpoint && (
                    <div className="num mt-2 truncate text-[11px] text-muted-foreground">
                      {t.endpoint}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="num text-xs text-muted-foreground">
                  {t.lastCheckedAt ?? "—"}
                </span>
                <Button size="sm" variant="outline" onClick={() => testMutation.mutate(t.id)}>
                  اختبار
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
