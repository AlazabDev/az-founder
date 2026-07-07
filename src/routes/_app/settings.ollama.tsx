import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Save, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getOllamaSettings, saveOllamaSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/settings/ollama")({
  component: OllamaSettingsPage,
});

function OllamaSettingsPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getOllamaSettings);
  const save = useServerFn(saveOllamaSettings);

  const q = useQuery({ queryKey: ["ollama-settings"], queryFn: fetchSettings });

  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [clearPass, setClearPass] = useState(false);

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

        <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
}
