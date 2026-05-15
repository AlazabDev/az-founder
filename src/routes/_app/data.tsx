import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  FolderSearch,
  Loader2,
  RefreshCw,
  Send,
  X,
} from "lucide-react";

import { PageHeader, EmptyState } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";
import { BRANDS, DEFAULT_BRAND } from "@/lib/config";

export const Route = createFileRoute("/_app/data")({
  component: DataPage,
});

interface DataJob {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  brand: string;
  projectName?: string | null;
  clientName?: string | null;
  category: string;
  status:
    | "queued"
    | "uploading"
    | "uploaded"
    | "analyzing"
    | "review_required"
    | "ready"
    | "failed";
  progress: number;
  createdAt: string;
}

const CATEGORIES = [
  "مشروع تجاري",
  "مشروع سكني",
  "صيانة",
  "توريدات",
  "فواتير",
  "صور موقع",
  "تقارير PDF",
  "مقايسات",
  "عقود",
  "عروض أسعار",
  "مستندات عميل",
  "بيانات خام",
];

function statusBadge(s: DataJob["status"]) {
  const map: Record<DataJob["status"], { cls: string; label: string }> = {
    queued: { cls: "bg-muted text-muted-foreground", label: "في الانتظار" },
    uploading: { cls: "bg-primary/15 text-primary", label: "يتم الرفع" },
    uploaded: { cls: "bg-primary/15 text-primary", label: "مرفوع" },
    analyzing: { cls: "bg-primary/15 text-primary", label: "تحليل" },
    review_required: { cls: "bg-warning/20 text-warning", label: "بحاجة لمراجعة" },
    ready: { cls: "bg-success/20 text-success", label: "جاهز" },
    failed: { cls: "bg-destructive/20 text-destructive", label: "فشل" },
  };
  const m = map[s];
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DataPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [brand, setBrand] = useState<string>(DEFAULT_BRAND);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");

  const jobsQuery = useQuery({
    queryKey: ["data", "jobs"],
    queryFn: () => api<DataJob[]>("/api/data/jobs"),
    retry: 0,
    refetchInterval: 5000,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("لم يتم اختيار ملفات");
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f, f.name));
      fd.append("brand", brand);
      fd.append("category", category);
      if (projectName) fd.append("projectName", projectName);
      if (clientName) fd.append("clientName", clientName);
      return api("/api/data/upload", { method: "POST", formData: fd });
    },
    onSuccess: () => {
      toast.success("تم إرسال الملفات للتحليل");
      setFiles([]);
      setProjectName("");
      setClientName("");
      qc.invalidateQueries({ queryKey: ["data", "jobs"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/data/jobs/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("تم الاعتماد");
      qc.invalidateQueries({ queryKey: ["data", "jobs"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الاعتماد"),
  });

  const sendKbMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/data/jobs/${id}/send-to-knowledge-base`, { method: "POST" }),
    onSuccess: () => toast.success("أُرسل إلى قاعدة المعرفة"),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الإرسال"),
  });

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  return (
    <div>
      <PageHeader
        title="فحص وتنظيم البيانات"
        description="رفع ملفات المؤسسة (صور، PDF، Excel، CSV، DOCX)، إرسالها للتحليل، ومراجعة النتائج قبل اعتمادها وإرسالها لقاعدة المعرفة والفهرسة."
      />

      {/* Uploader */}
      <div className="rounded-lg border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">العلامة التجارية</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">نوع البيانات</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المشروع (اختياري)</Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">اسم العميل (اختياري)</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
        </div>

        <div
          className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background/50 px-4 py-10 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onPickFiles(e.dataTransfer.files);
          }}
        >
          <CloudUpload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm">اسحب وأفلت الملفات هنا أو</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fileRef.current?.click()}
          >
            اختر ملفات
          </Button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.csv,.txt"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            مسموح: PDF, JPG, PNG, WEBP, DOCX, XLSX, CSV, TXT
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              <span className="num">{files.length}</span> ملف جاهز للإرسال
            </div>
            <ul className="max-h-44 space-y-1 overflow-auto">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="num shrink-0 text-xs text-muted-foreground">
                      {fmtSize(f.size)}
                    </span>
                  </div>
                  <button
                    onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                <Send className="ml-2 h-4 w-4" /> بدء التحليل
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Jobs */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">وظائف التحليل</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {jobsQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-lg border bg-card p-10 text-muted-foreground">
            <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ التحميل…
          </div>
        ) : jobsQuery.error ? (
          <EmptyState
            title="تعذّر تحميل الوظائف"
            description={(jobsQuery.error as Error).message}
          />
        ) : !jobsQuery.data || jobsQuery.data.length === 0 ? (
          <EmptyState
            icon={<FolderSearch className="h-5 w-5" />}
            title="لا توجد وظائف بعد"
            description="بعد رفع الملفات وبدء التحليل ستظهر الوظائف هنا للمتابعة والمراجعة."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right">الملف</th>
                  <th className="px-4 py-3 text-right">العلامة</th>
                  <th className="px-4 py-3 text-right">المشروع</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right w-40">التقدم</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {jobsQuery.data.map((j) => (
                  <tr key={j.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{j.fileName}</div>
                      <div className="num text-xs text-muted-foreground">
                        {j.fileType.toUpperCase()} · {fmtSize(j.size)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{j.brand}</td>
                    <td className="px-4 py-3 text-xs">
                      {j.projectName || "—"}
                      {j.clientName ? (
                        <div className="text-muted-foreground">{j.clientName}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{statusBadge(j.status)}</td>
                    <td className="px-4 py-3">
                      <Progress value={j.progress} className="h-2" />
                      <div className="mt-1 num text-xs text-muted-foreground">
                        {j.progress}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {j.status === "review_required" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(j.id)}
                          >
                            <CheckCircle2 className="ml-1 h-3.5 w-3.5" /> اعتماد
                          </Button>
                        )}
                        {(j.status === "ready" || j.status === "review_required") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendKbMutation.mutate(j.id)}
                          >
                            إلى قاعدة المعرفة
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
