import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HardDrive, RefreshCcw, FileText, Loader2, Sparkles, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_app/gdrive")({
  component: GDrivePage,
});

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}
interface ListResp { mode: string; files: DriveFile[]; nextPageToken?: string }
interface ReportResp {
  mode: string;
  report: string;
  sources: Array<{ id: string; name: string; mimeType: string; chars: number; error?: string }>;
}

function fmtSize(s?: string) {
  if (!s) return "—";
  const n = Number(s);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function GDrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState(
    "حلّل محتوى الملفات المرفقة وأنشئ تقريرًا تنفيذيًا منظمًا.",
  );
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportResp | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = query.trim() ? `name contains '${query.trim().replace(/'/g, "\\'")}'` : "";
      const path = q ? `/api/gdrive/files?q=${encodeURIComponent(q)}` : "/api/gdrive/files";
      const data = await api<ListResp>(path);
      setFiles(data.files ?? []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "تعذّر تحميل ملفات Google Drive");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function generate() {
    if (selected.size === 0) return;
    setGenerating(true);
    setReport(null);
    try {
      const data = await api<ReportResp>("/api/gdrive/report", {
        method: "POST",
        body: { fileIds: Array.from(selected), instructions, language: "ar" },
      });
      setReport(data);
    } catch (e) {
      setReport({
        mode: "error",
        report: e instanceof ApiError ? e.message : "فشل توليد التقرير",
        sources: [],
      });
    } finally {
      setGenerating(false);
    }
  }

  const selectedCount = selected.size;
  const filtered = useMemo(() => files, [files]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Drive — تحويل الملفات إلى تقارير"
        description="استعرض ملفات Google Drive المتصلة، اختر الملفات، ثم ولّد تقريرًا منظمًا عبر Azure OpenAI."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Files list */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم الملف…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                className="pe-9"
              />
            </div>
            <Button onClick={load} disabled={loading} variant="secondary">بحث</Button>
          </div>

          {err ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}

          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="me-2 h-4 w-4 animate-spin" /> جارٍ التحميل…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<HardDrive className="h-5 w-5" />}
              title="لا توجد ملفات"
              description="لم نعثر على ملفات مطابقة. جرّب بحثًا مختلفًا أو حدّث القائمة."
            />
          ) : (
            <div className="divide-y rounded-md border">
              {filtered.map((f) => {
                const checked = selected.has(f.id);
                return (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/40"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(f.id)} />
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{f.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {f.mimeType} · {fmtSize(f.size)} ·{" "}
                        {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("ar-EG") : "—"}
                      </div>
                    </div>
                    {f.webViewLink ? (
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        فتح
                      </a>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Generator */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> توليد تقرير
          </div>
          <div className="text-xs text-muted-foreground">
            تم اختيار <span className="font-bold text-foreground">{selectedCount}</span> ملف
          </div>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="اكتب التعليمات للتقرير…"
          />
          <Button
            onClick={generate}
            disabled={generating || selectedCount === 0}
            className="w-full"
          >
            {generating ? (
              <><Loader2 className="me-2 h-4 w-4 animate-spin" /> جارٍ التوليد…</>
            ) : (
              <><Sparkles className="me-2 h-4 w-4" /> ولّد التقرير</>
            )}
          </Button>

          {report ? (
            <div className="space-y-2 pt-2">
              <div className="text-xs text-muted-foreground">
                الوضع: <span className="font-medium text-foreground">{report.mode}</span>
              </div>
              {report.sources.length > 0 ? (
                <div className="rounded-md border bg-muted/40 p-2 text-xs">
                  <div className="mb-1 font-semibold">المصادر:</div>
                  <ul className="space-y-0.5">
                    {report.sources.map((s) => (
                      <li key={s.id} className="truncate">
                        • {s.name} — {s.error ? <span className="text-destructive">{s.error}</span> : `${s.chars} حرف`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-relaxed">
                {report.report}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
