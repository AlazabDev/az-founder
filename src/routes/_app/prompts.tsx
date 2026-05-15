import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { BRANDS, DEFAULT_BRAND } from "@/lib/config";

export const Route = createFileRoute("/_app/prompts")({
  component: PromptsPage,
});

interface Prompt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  brand: string;
  version: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function PromptsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => api<Prompt[]>("/api/prompts"),
    retry: 0,
  });

  const [editing, setEditing] = useState<Partial<Prompt> | null>(null);

  const saveMutation = useMutation({
    mutationFn: (p: Partial<Prompt>) =>
      p.id
        ? api(`/api/prompts/${p.id}`, { method: "PUT", body: p })
        : api("/api/prompts", { method: "POST", body: p }),
    onSuccess: () => {
      toast.success("تم الحفظ");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/prompts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الحذف"),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api(`/api/prompts/${id}/test`, { method: "POST" }),
    onSuccess: () => toast.success("تم تشغيل اختبار البرومبت"),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الاختبار"),
  });

  return (
    <div>
      <PageHeader
        title="استوديو البرومبت"
        description="إدارة البرومبتات الموجَّهة لتحليل الملفات وإجابة المحادثات وتصنيف المحتوى."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() =>
                setEditing({
                  name: "",
                  description: "",
                  systemPrompt: "",
                  brand: DEFAULT_BRAND,
                  version: 1,
                  isActive: true,
                })
              }
            >
              <Plus className="ml-2 h-4 w-4" /> برومبت جديد
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
              <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
            </div>
          ) : error ? (
            <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="لا توجد برومبتات بعد"
              description="أنشئ برومبت جديد لتحليل ملفات PDF أو الصور أو لتصنيف المحتوى."
            />
          ) : (
            <ul className="space-y-2">
              {data.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="num rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                        v{p.version}
                      </span>
                      {p.isActive ? (
                        <span className="rounded bg-success/20 px-1.5 text-[10px] text-success">
                          نشط
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                          متوقف
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testMutation.mutate(p.id)}>
                      اختبار
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {editing ? (editing.id ? "تعديل برومبت" : "برومبت جديد") : "حدّد برومبت للتعديل"}
          </h3>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الاسم</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">العلامة التجارية</Label>
                <Select
                  value={editing.brand ?? DEFAULT_BRAND}
                  onValueChange={(v) => setEditing({ ...editing, brand: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">System Prompt</Label>
                <Textarea
                  rows={10}
                  dir="ltr"
                  className="font-mono text-xs text-left"
                  value={editing.systemPrompt ?? ""}
                  onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label className="text-xs">نشط</Label>
                <Switch
                  checked={!!editing.isActive}
                  onCheckedChange={(v) => setEditing({ ...editing, isActive: v })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(editing)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  <Save className="ml-2 h-4 w-4" /> حفظ
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              اختر برومبت من القائمة أو أنشئ واحدًا جديدًا.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
