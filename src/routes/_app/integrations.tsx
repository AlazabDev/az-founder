import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_app/integrations")({
  component: IntegrationsPage,
});

interface IntegrationStatus {
  id: string;
  name: string;
  type: string;
  status: "connected" | "warning" | "disconnected" | "not_configured";
  hasSecret: boolean;
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  message?: string;
}

const PUBLIC_FIELDS: Array<{ id: string; label: string; placeholder?: string }> = [
  { id: "azure_tenant_id", label: "Azure Tenant ID" },
  { id: "azure_subscription_id", label: "Azure Subscription ID" },
  { id: "azure_resource_group", label: "Azure Resource Group" },
  { id: "azure_region", label: "Azure Region", placeholder: "e.g. westeurope" },
  { id: "azure_storage_account", label: "Azure Storage Account Name" },
  { id: "azure_storage_container", label: "Azure Storage Container Name" },
  { id: "azure_search_service", label: "Azure AI Search Service Name" },
  { id: "azure_search_index", label: "Azure AI Search Index Name" },
  { id: "azure_openai_endpoint", label: "Azure OpenAI Endpoint" },
  { id: "azure_openai_deployment", label: "Azure OpenAI Deployment Name" },
  { id: "azure_doc_intel_endpoint", label: "Azure Document Intelligence Endpoint" },
  { id: "azure_vision_endpoint", label: "Azure Vision Endpoint (optional)" },
];

const SECRET_FIELDS: Array<{ id: string; label: string }> = [
  { id: "azure_openai_key", label: "Azure OpenAI API Key" },
  { id: "azure_search_admin_key", label: "Azure AI Search Admin Key" },
  { id: "azure_doc_intel_key", label: "Azure Document Intelligence Key" },
  { id: "azure_storage_conn_string", label: "Azure Storage Connection String" },
  { id: "backend_admin_token", label: "Backend Admin Token" },
  { id: "webhook_secret", label: "Webhook Secret" },
];

function statusMeta(s: IntegrationStatus["status"]) {
  switch (s) {
    case "connected":
      return { dot: "status-dot--ok", text: "متصل" };
    case "warning":
      return { dot: "status-dot--warn", text: "تحذير" };
    case "disconnected":
      return { dot: "status-dot--err", text: "مقطوع" };
    default:
      return { dot: "status-dot--idle", text: "غير مُهيأ" };
  }
}

function IntegrationsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["integrations", "status"],
    queryFn: () => api<IntegrationStatus[]>("/api/integrations/config/status"),
    retry: 0,
  });

  const [publicValues, setPublicValues] = useState<Record<string, string>>({});
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const saveMutation = useMutation({
    mutationFn: (payload: { publicConfig: Record<string, string>; secrets: Record<string, string> }) =>
      api("/api/integrations/config/save", { method: "POST", body: payload }),
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات. الأسرار مرسلة للباك اند ولا تُحفظ في الواجهة.");
      setSecretValues({});
      qc.invalidateQueries({ queryKey: ["integrations", "status"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الحفظ"),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/integrations/${id}/test`, { method: "POST" }),
    onSuccess: () => {
      toast.success("اختبار الاتصال نجح");
      qc.invalidateQueries({ queryKey: ["integrations", "status"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "اختبار فاشل"),
  });

  const deleteSecretMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/integrations/${id}/secret`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم حذف السر من الباك اند");
      qc.invalidateQueries({ queryKey: ["integrations", "status"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "تعذّر الحذف"),
  });

  function handleSave() {
    const filteredSecrets = Object.fromEntries(
      Object.entries(secretValues).filter(([, v]) => v && v.trim().length > 0),
    );
    saveMutation.mutate({
      publicConfig: publicValues,
      secrets: filteredSecrets,
    });
  }

  return (
    <div>
      <PageHeader
        title="مركز الربط والمعرفات"
        description="إدخال بيانات الاتصال بخدمات Azure AI. الأسرار تُرسل للباك اند ليحفظها في Azure Key Vault — ولا تُخزَّن في المتصفح أو تظهر بعد الحفظ."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              تحديث الحالة
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </>
        }
      />

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config">
            <PlugZap className="ml-2 h-4 w-4" /> الإعدادات والمعرفات
          </TabsTrigger>
          <TabsTrigger value="secrets">
            <KeyRound className="ml-2 h-4 w-4" /> الأسرار
          </TabsTrigger>
          <TabsTrigger value="status">
            <ShieldCheck className="ml-2 h-4 w-4" /> حالة الاتصال
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <div className="grid gap-3 rounded-lg border bg-card p-5 md:grid-cols-2">
            {PUBLIC_FIELDS.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label htmlFor={f.id} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={f.id}
                  dir="ltr"
                  className="text-left"
                  placeholder={f.placeholder}
                  value={publicValues[f.id] ?? ""}
                  onChange={(e) =>
                    setPublicValues((p) => ({ ...p, [f.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="secrets">
          <div className="rounded-lg border bg-card p-5">
            <p className="mb-4 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground/90">
              الأسرار تُرسَل مرة واحدة وتُخزَّن في Azure Key Vault عبر الباك اند.
              لن تظهر قيمتها مرة أخرى. إذا احتجت لتغيير سر، أعد إدخاله ثم احفظ.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {SECRET_FIELDS.map((f) => {
                const visible = revealed[f.id];
                return (
                  <div key={f.id} className="space-y-1.5">
                    <Label htmlFor={f.id} className="text-xs">
                      {f.label}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={f.id}
                        dir="ltr"
                        className="text-left font-mono text-xs"
                        type={visible ? "text" : "password"}
                        autoComplete="off"
                        placeholder="••••••••••••••••"
                        value={secretValues[f.id] ?? ""}
                        onChange={(e) =>
                          setSecretValues((p) => ({ ...p, [f.id]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [f.id]: !r[f.id] }))
                        }
                        title={visible ? "إخفاء" : "إظهار"}
                      >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => deleteSecretMutation.mutate(f.id)}
                        title="حذف السر من الباك اند"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="status">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
              <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
            </div>
          ) : error ? (
            <EmptyState
              title="تعذّر تحميل حالة الاتصال"
              description={(error as Error).message}
            />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={<PlugZap className="h-5 w-5" />}
              title="لا توجد خدمات مُهيأة بعد"
              description="بعد حفظ الإعدادات والأسرار، ستظهر هنا حالة كل خدمة."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-right">الخدمة</th>
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">سر محفوظ</th>
                    <th className="px-4 py-3 text-right">آخر فحص</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => {
                    const m = statusMeta(s.status);
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 num text-xs text-muted-foreground">
                          {s.type}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className={`status-dot ${m.dot}`} />
                            {m.text}
                          </span>
                          {s.message ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {s.message}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {s.hasSecret ? (
                            <span className="text-success">نعم</span>
                          ) : (
                            <span className="text-muted-foreground">لا</span>
                          )}
                        </td>
                        <td className="px-4 py-3 num text-xs text-muted-foreground">
                          {s.lastCheckedAt ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testMutation.mutate(s.id)}
                            disabled={testMutation.isPending}
                          >
                            اختبار
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
