import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Library, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_app/knowledge")({
  component: KnowledgePage,
});

interface KnowledgeSource {
  id: string;
  name: string;
  type: string;
  brand: string;
  status: "pending" | "indexing" | "ready" | "failed";
  documentsCount: number;
  lastIndexedAt?: string;
}

function statusBadge(s: KnowledgeSource["status"]) {
  const map = {
    pending: "bg-muted text-muted-foreground",
    indexing: "bg-primary/15 text-primary",
    ready: "bg-success/20 text-success",
    failed: "bg-destructive/20 text-destructive",
  };
  const label = { pending: "قيد الإعداد", indexing: "يفهرس", ready: "جاهز", failed: "فشل" };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${map[s]}`}>
      {label[s]}
    </span>
  );
}

function KnowledgePage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["knowledge", "sources"],
    queryFn: () => api<KnowledgeSource[]>("/api/knowledge/sources"),
    retry: 0,
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/knowledge/reindex`, { method: "POST", body: { id } }),
    onSuccess: () => {
      toast.success("بدأت إعادة الفهرسة");
      qc.invalidateQueries({ queryKey: ["knowledge", "sources"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الطلب"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/knowledge/sources/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["knowledge", "sources"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الحذف"),
  });

  return (
    <div>
      <PageHeader
        title="مدير قاعدة المعرفة"
        description="إدارة مصادر المعرفة المُفهرسة في Azure AI Search والمستخدمة في المحادثات والتحليلات."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button size="sm">
              <UploadCloud className="ml-2 h-4 w-4" /> رفع مصدر جديد
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
          <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title="لا توجد مصادر معرفة بعد"
          description="ارفع ملفات أو اعتمد نتائج التحليل من صفحة فحص البيانات لتظهر مصادر المعرفة هنا."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">النوع</th>
                <th className="px-4 py-3 text-right">العلامة</th>
                <th className="px-4 py-3 text-right">المستندات</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">آخر فهرسة</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 num text-xs text-muted-foreground">{s.type}</td>
                  <td className="px-4 py-3 text-xs">{s.brand}</td>
                  <td className="px-4 py-3 num">{s.documentsCount.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 num text-xs text-muted-foreground">
                    {s.lastIndexedAt ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reindexMutation.mutate(s.id)}
                      >
                        <Database className="ml-1 h-3.5 w-3.5" /> إعادة فهرسة
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
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
