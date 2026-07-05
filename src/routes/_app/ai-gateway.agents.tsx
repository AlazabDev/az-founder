import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bot } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listAgents, upsertAgent, deleteAgent } from "@/lib/agents.functions";
import { listEndpoints } from "@/lib/endpoints.functions";

export const Route = createFileRoute("/_app/ai-gateway/agents")({
  component: AgentsPage,
});

type Agent = Awaited<ReturnType<typeof listAgents>>[number];

const KINDS = ["copilot", "core", "prod", "maint", "finance", "custom"] as const;

function AgentsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listAgents);
  const fetchEndpoints = useServerFn(listEndpoints);
  const save = useServerFn(upsertAgent);
  const remove = useServerFn(deleteAgent);

  const list = useQuery({ queryKey: ["agents"], queryFn: fetchList });
  const eps = useQuery({ queryKey: ["endpoints"], queryFn: fetchEndpoints });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);

  const saveMut = useMutation({
    mutationFn: (v: Partial<Agent>) => save({ data: v as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      setOpen(false);
      toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success("تم الحذف");
    },
  });

  function openNew() {
    setEditing({
      name: "",
      display_name: "",
      kind: "custom",
      version: "1",
      model: "",
      endpoint_id: null,
      system_prompt: "",
      enabled: true,
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="AI Agents"
        description="إدارة الوكلاء الذكيين المرتبطين بنماذج Azure Foundry."
        actions={
          <Button onClick={openNew}>
            <Plus className="ml-2 h-4 w-4" /> وكيل جديد
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
            <tr>
              <th className="p-3">الاسم</th>
              <th className="p-3">النوع</th>
              <th className="p-3">الإصدار</th>
              <th className="p-3">النموذج</th>
              <th className="p-3">Endpoint</th>
              <th className="p-3">الحالة</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((a) => {
              const ep = (a as unknown as { ai_endpoints?: { name: string } | null }).ai_endpoints;
              return (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Bot className="h-4 w-4 text-primary" />
                      {a.name}
                    </div>
                    {a.display_name && (
                      <div className="text-xs text-muted-foreground">{a.display_name}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{a.kind}</Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{a.version ?? "-"}</td>
                  <td className="p-3 font-mono text-xs">{a.model ?? "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{ep?.name ?? "-"}</td>
                  <td className="p-3">
                    {a.enabled ? (
                      <Badge variant="outline" className="border-green-500/40 text-green-600">
                        مفعّل
                      </Badge>
                    ) : (
                      <Badge variant="outline">معطّل</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("حذف؟") && delMut.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  لا يوجد وكلاء. أضف واحداً للبدء.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل الوكيل" : "وكيل جديد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="الاسم (فريد)">
                  <Input
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="az-agent-core"
                  />
                </Field>
                <Field label="الاسم المعروض">
                  <Input
                    value={editing.display_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="النوع">
                  <Select
                    value={editing.kind ?? "custom"}
                    onValueChange={(v) => setEditing({ ...editing, kind: v as Agent["kind"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="الإصدار">
                  <Input
                    value={editing.version ?? ""}
                    onChange={(e) => setEditing({ ...editing, version: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Endpoint (النموذج المرتبط)">
                <Select
                  value={editing.endpoint_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, endpoint_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر endpoint" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بلا —</SelectItem>
                    {(eps.data ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.model})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="النموذج (للعرض/التسعير)">
                <Input
                  value={editing.model ?? ""}
                  onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                  placeholder="gpt-5.5"
                />
              </Field>
              <Field label="System Prompt">
                <Textarea
                  rows={4}
                  value={editing.system_prompt ?? ""}
                  onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Switch
                  checked={editing.enabled ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, enabled: v })}
                />
                مفعّل
              </label>
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
