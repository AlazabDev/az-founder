import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Cloud, HardDrive, Database, CloudCog, Plus, Trash2, Wifi } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  listStorageProviders, upsertStorageProvider,
  deleteStorageProvider, testStorageProvider,
} from "@/lib/storage-providers.functions";

export const Route = createFileRoute("/_app/storage")({
  component: StoragePage,
});

const PROVIDERS = [
  { id: "azure_blob", label: "Azure Blob", icon: CloudCog,
    hint: "يتطلّب AZURE_STORAGE_CONNECTION_STRING في الأسرار.",
    fields: [{ key: "container", label: "Container", placeholder: "documents" }] },
  { id: "aws_s3", label: "AWS S3", icon: Cloud,
    hint: "يُدار عبر Lovable Connectors (AWS_S3_API_KEY).",
    fields: [{ key: "bucket", label: "Bucket (اسم)", placeholder: "my-bucket" }] },
  { id: "google_drive", label: "Google Drive", icon: HardDrive,
    hint: "مربوط عبر Google Drive Connector.",
    fields: [{ key: "root_folder_id", label: "Root Folder ID (اختياري)", placeholder: "" }] },
  { id: "supabase", label: "Supabase Storage", icon: Database,
    hint: "تخزين داخل مشروع Supabase.",
    fields: [{ key: "bucket", label: "Bucket", placeholder: "public" }] },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

function StoragePage() {
  const qc = useQueryClient();
  const fList = useServerFn(listStorageProviders);
  const fSave = useServerFn(upsertStorageProvider);
  const fDel = useServerFn(deleteStorageProvider);
  const fTest = useServerFn(testStorageProvider);

  const list = useQuery({ queryKey: ["storage-providers"], queryFn: fList });
  const [tab, setTab] = useState<ProviderId>("azure_blob");
  const [open, setOpen] = useState(false);
  interface Draft {
    id?: string;
    provider: ProviderId;
    display_name: string;
    config: Record<string, unknown>;
    enabled: boolean;
    is_default: boolean;
  }
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (v: Draft) => fSave({ data: v as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-providers"] });
      setOpen(false); toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => fDel({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-providers"] }),
  });
  const test = useMutation({
    mutationFn: (p: ProviderId) => fTest({ data: { provider: p } }),
    onSuccess: (r) => {
      const res = r as { ok: boolean; hint?: string };
      res.ok ? toast.success(res.hint ?? "متصل") : toast.error(res.hint ?? "غير متصل");
    },
  });

  function openNew(p: ProviderId) {
    setDraft({
      provider: p,
      display_name: PROVIDERS.find((x) => x.id === p)!.label,
      config: {},
      enabled: true,
      is_default: false,
    });
    setOpen(true);
  }

  const rowsByProvider = (p: ProviderId) => (list.data ?? []).filter((r) => r.provider === p);

  return (
    <div>
      <PageHeader
        title="المخازن السحابية"
        description="أدر وربط موفّري التخزين: Azure Blob, AWS S3, Google Drive, Supabase Storage."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProviderId)}>
        <TabsList>
          {PROVIDERS.map((p) => (
            <TabsTrigger key={p.id} value={p.id} className="gap-2">
              <p.icon className="h-4 w-4" /> {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDERS.map((p) => (
          <TabsContent key={p.id} value={p.id} className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.hint}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => test.mutate(p.id)}>
                    <Wifi className="ml-2 h-4 w-4" /> اختبار الاتصال
                  </Button>
                  <Button size="sm" onClick={() => openNew(p.id)}>
                    <Plus className="ml-2 h-4 w-4" /> إضافة إعداد
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">الاسم</th>
                    <th className="p-3">التكوين</th>
                    <th className="p-3">افتراضي</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByProvider(p.id).map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{r.display_name}</td>
                      <td className="p-3 font-mono text-xs">{JSON.stringify(r.config)}</td>
                      <td className="p-3">{r.is_default ? <Badge>افتراضي</Badge> : "-"}</td>
                      <td className="p-3">
                        {r.enabled
                          ? <Badge variant="outline" className="border-green-500/40 text-green-600">مفعّل</Badge>
                          : <Badge variant="outline">معطّل</Badge>}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost"
                          onClick={() => confirm("حذف؟") && del.mutate(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rowsByProvider(p.id).length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لم يُضَف بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة {PROVIDERS.find((x) => x.id === draft?.provider)?.label}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">الاسم</Label>
                <Input className="mt-1" value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
              </div>
              {PROVIDERS.find((x) => x.id === draft.provider)?.fields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input className="mt-1" placeholder={f.placeholder}
                    value={String(draft.config[f.key] ?? "")}
                    onChange={(e) => setDraft({ ...draft, config: { ...draft.config, [f.key]: e.target.value } })} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Switch checked={draft.enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} /> مفعّل
                </label>
                <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Switch checked={draft.is_default}
                    onCheckedChange={(v) => setDraft({ ...draft, is_default: v })} /> افتراضي
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => draft && save.mutate(draft)} disabled={save.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
