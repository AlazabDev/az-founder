import { createFileRoute } from "@tanstack/react-router";
import { currentMode, jsonOk, jsonErr, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonErr(400, "FormData غير صالح");
        }
        const files = form.getAll("files").filter((v): v is File => v instanceof File);
        if (files.length === 0) return jsonErr(400, "لم يتم إرسال ملفات");

        const brand = String(form.get("brand") ?? "");
        const category = String(form.get("category") ?? "");
        const projectName = String(form.get("projectName") ?? "") || null;
        const clientName = String(form.get("clientName") ?? "") || null;

        const mode = currentMode();
        const t = nowIso();
        const jobs = files.map((f, i) => ({
          id: `job_${Date.now().toString(36)}_${i}`,
          fileName: f.name,
          fileType: (f.name.split(".").pop() ?? "bin").toLowerCase(),
          size: f.size,
          brand,
          category,
          projectName,
          clientName,
          status: mode === "live" ? "queued" : "review_required",
          progress: 0,
          createdAt: t,
          message:
            mode === "live"
              ? "تم استلام الملف وإرساله لطابور التحليل"
              : "تم استلام الملف. التحليل الفعلي يحتاج ضبط أسرار Azure (Document Intelligence / OpenAI).",
        }));

        return jsonOk({ mode, accepted: jobs.length, jobs });
      },
    },
  },
});
