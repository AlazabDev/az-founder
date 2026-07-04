import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listPolicies, upsertPolicy, deletePolicy } from "@/lib/policies.functions";
import { listEndpoints } from "@/lib/endpoints.functions";

export const Route = createFileRoute("/_app/ai-gateway/policies")({
  component: PoliciesPage,
});

type PolicyType = "rate_limit" | "quota" | "content_filter" | "cost_cap" | "circuit_breaker";
interface PolicyDraft {
  id?: string;
  name: string;
  policy_type: PolicyType;
  config: Record<string, unknown>;
  enabled: boolean;
  applies_to_endpoint_id: string | null;
}

function PoliciesPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listPolicies);
  const fSave = useServerFn(upsertPolicy);
  const fDel = useServerFn(deletePolicy);
  const fEps = useServerFn(listEndpoints);

  const list = useQuery({ queryKey: ["policies"], queryFn: fList });
  const eps = useQuery({ queryKey: ["endpoints"], queryFn: fEps });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);

  const save = useMutation({
    mutationFn: (v: PolicyDraft) => fSave({ data: v as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policies"] });
      setOpen(false);
      toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => fDel({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });

  function openNew() {
    setDraft({
      name: "",
      policy_type: "rate_limit",
      config: { minute: 60, hour: 1000, day: 10000 },
      enabled: true,
      applies_to_endpoint_id: null,
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="APIM Policies"
        description="سياسات إنتاجية: حد المعدل، الحصة، فلتر المحتوى، سقف التكلفة، قاطع الدائرة."
        actions={<Button onClick={openNew}><Plus className="ml-2 h-4 w-4" /> جديد</Button>}
      />

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
            <tr>
              <th className="p-3">الاسم</th>
              <th className="p-3">النوع</th>
              <th className="p-3">التكوين</th>
              <th className="p-3">النطاق</th>
              <th className="p-3">الحالة</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((p) => {
              const scope = (p as { ai_endpoints?: { name?: string } | null }).ai_endpoints?.name ?? "الكل";
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3"><Badge variant="outline">{p.policy_type}</Badge></td>
                  <td className="p-3 max-w-md truncate font-mono text-xs">{JSON.stringify(p.config)}</td>
                  <td className="p-3 text-xs">{scope}</td>
                  <td className="p-3">
                    {p.enabled ? (
                      <Badge variant="outline" className="border-green-500/40 text-green-600">مفعّل</Badge>
                    ) : <Badge variant="outline">معطّل</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setDraft({
                          id: p.id, name: p.name, policy_type: p.policy_type as PolicyType,
                          config: (p.config ?? {}) as Record<string, unknown>,
                          enabled: p.enabled, applies_to_endpoint_id: p.applies_to_endpoint_id,
                        });
                        setOpen(true);
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("حذف؟") && del.mutate(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.data?.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد سياسات.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "تعديل سياسة" : "سياسة جديدة"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3">
              <Field label="الاسم">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="النوع">
                <Select
                  value={draft.policy_type}
                  onValueChange={(v) => {
                    const type = v as PolicyType;
                    const defaults: Record<PolicyType, Record<string, unknown>> = {
                      rate_limit: { minute: 60, hour: 1000, day: 10000 },
                      quota: { max_tokens_per_day: 1000000 },
                      content_filter: { enabled: true },
                      cost_cap: { max_usd_per_day: 10 },
                      circuit_breaker: { failure_threshold: 5, cooldown_ms: 60000 },
                    };
                    setDraft({ ...draft, policy_type: type, config: defaults[type] });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rate_limit">Rate Limit</SelectItem>
                    <SelectItem value="quota">Token Quota</SelectItem>
                    <SelectItem value="content_filter">Content Filter</SelectItem>
                    <SelectItem value="cost_cap">Cost Cap</SelectItem>
                    <SelectItem value="circuit_breaker">Circuit Breaker</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="النطاق">
                <Select
                  value={draft.applies_to_endpoint_id ?? "all"}
                  onValueChange={(v) => setDraft({ ...draft, applies_to_endpoint_id: v === "all" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الـ endpoints</SelectItem>
                    {(eps.data ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="التكوين (JSON)">
                <textarea
                  className="min-h-32 w-full rounded-md border bg-background p-2 font-mono text-xs"
                  value={JSON.stringify(draft.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setDraft({ ...draft, config: parsed });
                    } catch {
                      /* keep typing */
                    }
                  }}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                مفعّل
              </label>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
