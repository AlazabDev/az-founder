import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, PlugZap } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listEndpoints, upsertEndpoint, deleteEndpoint, testEndpoint,
} from "@/lib/endpoints.functions";

export const Route = createFileRoute("/_app/ai-gateway/endpoints")({
  component: EndpointsPage,
});

type Endpoint = Awaited<ReturnType<typeof listEndpoints>>[number];

function EndpointsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listEndpoints);
  const save = useServerFn(upsertEndpoint);
  const remove = useServerFn(deleteEndpoint);
  const test = useServerFn(testEndpoint);

  const list = useQuery({ queryKey: ["endpoints"], queryFn: fetchList });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Endpoint> | null>(null);

  const saveMut = useMutation({
    mutationFn: (v: Partial<Endpoint>) => save({ data: v as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      setOpen(false);
      toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      toast.success("تم الحذف");
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (r) => {
      const res = r as { ok: boolean; latency_ms?: number; status?: number; error?: string };
      if (res.ok) toast.success(`متصل ✓ (${res.latency_ms}ms)`);
      else toast.error(`فشل: ${res.error ?? res.status}`);
    },
  });

  function openNew() {
    setEditing({
      name: "",
      provider: "azure_openai",
      base_url: "",
      deployment_name: "",
      model: "gpt-4o-mini",
      api_version: "2024-10-21",
      use_apim: false,
      is_default: false,
      enabled: true,
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="AI Endpoints"
        description="أضف واختبر نقاط خدمة الذكاء الاصطناعي (Azure OpenAI / OpenAI / APIM)."
        actions={
          <Button onClick={openNew}>
            <Plus className="ml-2 h-4 w-4" /> جديد
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
            <tr>
              <th className="p-3">الاسم</th>
              <th className="p-3">المزود</th>
              <th className="p-3">الموديل</th>
              <th className="p-3">النشر</th>
              <th className="p-3">APIM</th>
              <th className="p-3">افتراضي</th>
              <th className="p-3">الحالة</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{e.name}</td>
                <td className="p-3">{e.provider}</td>
                <td className="p-3 font-mono text-xs">{e.model}</td>
                <td className="p-3 font-mono text-xs">{e.deployment_name ?? "-"}</td>
                <td className="p-3">{e.use_apim ? "✓" : "-"}</td>
                <td className="p-3">{e.is_default ? <Badge>افتراضي</Badge> : "-"}</td>
                <td className="p-3">
                  {e.enabled ? (
                    <Badge variant="outline" className="border-green-500/40 text-green-600">
                      مفعّل
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => testMut.mutate(e.id)} title="اختبار">
                      <PlugZap className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => confirm("حذف؟") && delMut.mutate(e.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {list.data?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  لا يوجد endpoints. أضف واحداً للبدء.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل" : "endpoint جديد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Field label="الاسم">
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="المزود">
                <Select
                  value={editing.provider ?? "azure_openai"}
                  onValueChange={(v) => setEditing({ ...editing, provider: v as Endpoint["provider"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="apim">Azure APIM</SelectItem>
                    <SelectItem value="lovable">Lovable AI</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Base URL (اترك فارغاً لاستخدام AZURE_OPENAI_ENDPOINT)">
                <Input
                  value={editing.base_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, base_url: e.target.value })}
                  placeholder="https://myres.openai.azure.com"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Deployment name">
                  <Input
                    value={editing.deployment_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, deployment_name: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                </Field>
                <Field label="الموديل (للتسعير)">
                  <Input
                    value={editing.model ?? ""}
                    onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                </Field>
              </div>
              <Field label="API version">
                <Input
                  value={editing.api_version ?? ""}
                  onChange={(e) => setEditing({ ...editing, api_version: e.target.value })}
                  placeholder="2024-10-21"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Toggle label="عبر APIM" value={!!editing.use_apim} onChange={(v) => setEditing({ ...editing, use_apim: v })} />
                <Toggle label="افتراضي" value={!!editing.is_default} onChange={(v) => setEditing({ ...editing, is_default: v })} />
                <Toggle label="مفعّل" value={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => editing && saveMut.mutate(editing)} disabled={saveMut.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <Switch checked={value} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
