import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Boxes, Search, CheckCircle2, XCircle, Clock, Star } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listCatalog, type CatalogItem } from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/catalog")({
  component: CatalogPage,
});

const PROVIDER_LABELS: Record<string, { label: string; className: string }> = {
  azure_openai: { label: "Azure OpenAI", className: "bg-primary/15 text-primary" },
  apim: { label: "Azure APIM", className: "bg-primary/15 text-primary" },
  foundry: { label: "Azure Foundry", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  ollama: { label: "Ollama", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  openai: { label: "OpenAI", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  lovable: { label: "Lovable AI", className: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
};

function providerBadge(provider: string) {
  const p = PROVIDER_LABELS[provider] ?? { label: provider, className: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${p.className}`}>{p.label}</span>;
}

function StatusPill({ item }: { item: CatalogItem }) {
  if (!item.enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <XCircle className="h-3.5 w-3.5" /> معطّل
      </span>
    );
  }
  if (item.last_status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> متصل
        {item.last_latency_ms != null ? (
          <span className="num text-muted-foreground">· {item.last_latency_ms}ms</span>
        ) : null}
      </span>
    );
  }
  if (item.last_status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3.5 w-3.5" /> خطأ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" /> لم يُختبر
    </span>
  );
}

function CatalogPage() {
  const fetchList = useServerFn(listCatalog);
  const q = useQuery({ queryKey: ["catalog"], queryFn: fetchList });
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<string>("all");

  const items = q.data ?? [];
  const providers = useMemo(() => {
    const set = new Set(items.map((i) => i.provider));
    return Array.from(set);
  }, [items]);

  const filtered = items.filter((i) => {
    if (provider !== "all" && i.provider !== provider) return false;
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      i.name.toLowerCase().includes(s) ||
      i.model.toLowerCase().includes(s) ||
      (i.deployment_name ?? "").toLowerCase().includes(s) ||
      i.endpoint_url.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <PageHeader
        title="كتالوج النماذج"
        description="جميع النماذج المتاحة عبر Azure OpenAI / APIM و Azure Foundry و Ollama في مكان واحد لتسهيل اختيار النموذج المناسب."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الموديل أو العنوان..."
            className="pr-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={provider === "all"} onClick={() => setProvider("all")} label={`الكل (${items.length})`} />
          {providers.map((p) => (
            <FilterChip
              key={p}
              active={provider === p}
              onClick={() => setProvider(p)}
              label={`${PROVIDER_LABELS[p]?.label ?? p} (${items.filter((i) => i.provider === p).length})`}
            />
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-5 w-5" />}
          title="لا توجد نماذج مطابقة"
          description="جرّب تعديل الفلاتر أو أضف endpoint جديدًا من صفحة AI Gateway."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                    {item.is_default ? (
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {providerBadge(item.provider)}
                    <Badge variant="outline" className="num text-[10px]">
                      {item.deployment_name ?? item.model}
                    </Badge>
                  </div>
                </div>
                <StatusPill item={item} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Model
                </div>
                <div className="num truncate text-xs text-foreground">{item.model}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Endpoint
                </div>
                <div
                  dir="ltr"
                  className="num break-all rounded-md bg-muted/60 px-2 py-1.5 text-[11px] leading-relaxed text-foreground/90"
                  title={item.endpoint_url}
                >
                  {item.endpoint_url}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
