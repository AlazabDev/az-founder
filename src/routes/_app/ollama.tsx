import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, KeyRound, PlugZap, RefreshCw, Save, TriangleAlert, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getOllamaSettings,
  saveOllamaSettings,
  syncOllamaModels,
  testOllamaConnection,
  type OllamaSyncResult,
  type OllamaTestResult,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/ollama")({
  component: OllamaSettingsPage,
});

function OllamaSettingsPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getOllamaSettings);
  const save = useServerFn(saveOllamaSettings);
  const test = useServerFn(testOllamaConnection);
  const sync = useServerFn(syncOllamaModels);

  const q = useQuery({ queryKey: ["ollama-settings"], queryFn: fetchSettings });

  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [clearPass, setClearPass] = useState(false);
  const [testResult, setTestResult] = useState<OllamaTestResult | null>(null);
  const [syncResult, setSyncResult] = useState<OllamaSyncResult | null>(null);

  useEffect(() => {
    if (q.data) {
      setUrl(q.data.ollama_url);
      setUser(q.data.ollama_user);
      setPass("");
      setClearPass(false);
    }
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          ollama_url: url,
          ollama_user: user,
          ollama_pass: pass || undefined,
          clear_password: clearPass,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ollama-settings"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("تم حفظ بيانات وصول Ollama");
      setPass("");
      setClearPass(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      // Persist unsaved URL/user edits first so the test runs against what the user sees.
      await save({
        data: {
          ollama_url: url,
          ollama_user: user,
          ollama_pass: pass || undefined,
          clear_password: clearPass,
        },
      });
      return test({});
    },
    onSuccess: (r: OllamaTestResult) => {
      setTestResult(r);
      qc.invalidateQueries({ queryKey: ["ollama-settings"] });
      if (r.ok) toast.success(`الاتصال ناجح — Ollama ${r.version ?? ""} (${r.model_count ?? "?"} نموذج)`);
      else toast.error(r.error ?? "فشل الاتصال");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: async () => {
      await save({
        data: {
          ollama_url: url,
          ollama_user: user,
          ollama_pass: pass || undefined,
          clear_password: clearPass,
        },
      });
      return sync({});
    },
    onSuccess: (r: OllamaSyncResult) => {
      setSyncResult(r);
      qc.invalidateQueries({ queryKey: ["catalog"] });
      if (r.ok) toast.success(`تمت المزامنة — ${r.total ?? 0} نموذج على الخادم`);
      else toast.error(r.error ?? "فشلت المزامنة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="بيانات وصول Ollama"
        description="تُحفظ بيانات الاعتماد في قاعدة البيانات فقط ولا يتم تخزينها في المتصفح. القراءة والكتابة مقصورة على المدراء."
      />

      <div className="space-y-5 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <KeyRound className="h-4 w-4 text-primary" />
          <span>يتم استخدام هذه القيم عند استدعاء نماذج Ollama عبر AI Gateway</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">OLLAMA_URL</Label>
          <Input
            id="url"
            dir="ltr"
            placeholder="https://ollama.alazab.cloud"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user">OLLAMA_USER</Label>
          <Input
            id="user"
            dir="ltr"
            placeholder="azureuser"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pass">OLLAMA_PASS</Label>
            {q.data?.ollama_pass_set ? (
              <Badge variant="secondary" className="text-[10px]">
                محفوظة حاليًا
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                غير محفوظة
              </Badge>
            )}
          </div>
          <Input
            id="pass"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder={q.data?.ollama_pass_set ? "•••••••• (اتركها فارغة للإبقاء على القيمة الحالية)" : "أدخل كلمة المرور"}
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              if (e.target.value) setClearPass(false);
            }}
            disabled={clearPass}
          />
          {q.data?.ollama_pass_set ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={clearPass}
                onChange={(e) => {
                  setClearPass(e.target.checked);
                  if (e.target.checked) setPass("");
                }}
              />
              <Trash2 className="h-3 w-3" /> حذف كلمة المرور المحفوظة
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending || syncMut.isPending || !url || !user}
              className="gap-2"
            >
              <PlugZap className="h-4 w-4" />
              {testMut.isPending ? "جارٍ الاختبار..." : "اختبار الاتصال"}
            </Button>
            <Button
              variant="outline"
              onClick={() => syncMut.mutate()}
              disabled={testMut.isPending || syncMut.isPending || !url || !user}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
              {syncMut.isPending ? "جارٍ المزامنة..." : "مزامنة النماذج"}
            </Button>
          </div>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !url || !user}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {mut.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>

      {testResult ? (
        <div className="mt-5 space-y-3 rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            {testResult.ok ? (
              <>
                <BadgeCheck className="h-5 w-5 text-primary" />
                <span className="font-medium">الاتصال ناجح</span>
              </>
            ) : (
              <>
                <TriangleAlert className="h-5 w-5 text-destructive" />
                <span className="font-medium">فشل الاتصال</span>
              </>
            )}
            <Badge variant="outline" className="ms-auto text-[10px]">
              فحص اتصال مباشر
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">زمن الاستجابة</div>
              <div className={`mt-1 text-lg font-semibold ${latencyClass(testResult.latency_ms)}`}>
                {testResult.latency_ms != null ? `${testResult.latency_ms} م.ث` : "—"}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">إصدار Ollama</div>
              <div className="mt-1 text-lg font-semibold" dir="ltr">
                {testResult.version ?? "—"}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">النماذج المكتشفة</div>
              <div className="mt-1 text-lg font-semibold">
                {testResult.model_count != null ? testResult.model_count : "—"}
              </div>
            </div>
          </div>
          {!testResult.ok && testResult.error ? (
            <p className="text-sm text-destructive" dir="ltr">
              {testResult.error}
            </p>
          ) : null}
        </div>
      ) : null}

      {syncResult ? (
        <div className="mt-5 space-y-3 rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            {syncResult.ok ? (
              <>
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="font-medium">اكتملت المزامنة</span>
              </>
            ) : (
              <>
                <TriangleAlert className="h-5 w-5 text-destructive" />
                <span className="font-medium">فشلت المزامنة</span>
              </>
            )}
            <Badge variant="outline" className="ms-auto text-[10px]">
              مزامنة الكتالوج
            </Badge>
          </div>
          {syncResult.ok ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs text-muted-foreground">إجمالي النماذج على الخادم</div>
                  <div className="mt-1 text-lg font-semibold">{syncResult.total ?? 0}</div>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs text-muted-foreground">أُضيفت للكتالوج</div>
                  <div className="mt-1 text-lg font-semibold">{syncResult.added?.length ?? 0}</div>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs text-muted-foreground">عُطِّلت (غير موجودة على الخادم)</div>
                  <div className="mt-1 text-lg font-semibold">{syncResult.disabled?.length ?? 0}</div>
                </div>
              </div>
              {syncResult.added?.length ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">مضافة حديثًا: </span>
                  <span dir="ltr" className="font-mono">
                    {syncResult.added.join(", ")}
                  </span>
                </div>
              ) : null}
              {syncResult.disabled?.length ? (
                <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    نماذج معطلة لعدم وجودها على الخادم:{" "}
                    <span dir="ltr" className="font-mono">
                      {syncResult.disabled.join(", ")}
                    </span>
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-destructive" dir="ltr">
              {syncResult.error}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
