import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRANDS, getApiBaseUrl, setApiBaseUrl } from "@/lib/config";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const PREF_KEY = "alazab.prefs";
interface Prefs {
  defaultBrand: string;
  language: "ar" | "en";
  showTokens: boolean;
  showCost: boolean;
  healthIntervalSec: number;
  defaultUploadCategory: string;
  defaultAnalysisLanguage: "ar" | "en" | "mixed";
}
const DEFAULTS: Prefs = {
  defaultBrand: "alazab",
  language: "ar",
  showTokens: true,
  showCost: true,
  healthIntervalSec: 60,
  defaultUploadCategory: "بيانات خام",
  defaultAnalysisLanguage: "ar",
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl());
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs());

  function save() {
    setApiBaseUrl(baseUrl);
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    toast.success("تم حفظ الإعدادات محليًا");
  }

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        description="تفضيلات تشغيل الواجهة فقط. لا يتم تخزين أي أسرار هنا — الأسرار في الباك اند."
        actions={
          <Button size="sm" onClick={save}>
            <Save className="ml-2 h-4 w-4" /> حفظ
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SettingsIcon className="h-4 w-4" /> الباك اند
          </h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الرابط الأساسي للباك اند</Label>
              <Input
                dir="ltr"
                className="text-left"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://azab-rag-func.azurewebsites.net"
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم لجميع طلبات <span className="num">/api/*</span>. يحفظ محليًا في المتصفح.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">فترة فحص صحة الخدمات (ثانية)</Label>
              <Input
                type="number"
                dir="ltr"
                className="num text-left"
                value={prefs.healthIntervalSec}
                onChange={(e) =>
                  setPrefs({ ...prefs, healthIntervalSec: Number(e.target.value) || 60 })
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">عام</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">العلامة التجارية الافتراضية</Label>
              <Select
                value={prefs.defaultBrand}
                onValueChange={(v) => setPrefs({ ...prefs, defaultBrand: v })}
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
              <Label className="text-xs">اللغة الافتراضية</Label>
              <Select
                value={prefs.language}
                onValueChange={(v: "ar" | "en") => setPrefs({ ...prefs, language: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">لغة التحليل الافتراضية</Label>
              <Select
                value={prefs.defaultAnalysisLanguage}
                onValueChange={(v: Prefs["defaultAnalysisLanguage"]) =>
                  setPrefs({ ...prefs, defaultAnalysisLanguage: v })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">عربي</SelectItem>
                  <SelectItem value="en">إنجليزي</SelectItem>
                  <SelectItem value="mixed">مختلط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 md:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">العرض</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">إظهار التوكنات</Label>
                <p className="text-xs text-muted-foreground">عرض استهلاك التوكنات في المحادثة.</p>
              </div>
              <Switch
                checked={prefs.showTokens}
                onCheckedChange={(v) => setPrefs({ ...prefs, showTokens: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">إظهار التكلفة</Label>
                <p className="text-xs text-muted-foreground">عرض التكلفة التقديرية في اللوحات.</p>
              </div>
              <Switch
                checked={prefs.showCost}
                onCheckedChange={(v) => setPrefs({ ...prefs, showCost: v })}
              />
            </div>
          </div>
          <p className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
            لا يتم تخزين أي مفاتيح أو أسرار هنا. كل المعرفات الحساسة تُحفظ في
            <span className="num"> Azure Key Vault </span>
            عبر الباك اند.
          </p>
        </section>
      </div>
    </div>
  );
}
