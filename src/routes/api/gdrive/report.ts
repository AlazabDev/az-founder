import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, jsonErr, readAzureConfig, currentMode } from "@/lib/azure.server";
import { getFileMeta, extractText } from "@/lib/gdrive.server";

interface Body {
  fileIds?: string[];
  instructions?: string;
  language?: "ar" | "en";
}

async function summarize(text: string, instructions: string, language: "ar" | "en"): Promise<string> {
  const c = readAzureConfig();
  if (!c.openaiEndpoint || !c.openaiKey || !c.openaiDeployment) {
    throw new Error("Azure OpenAI غير مضبوط");
  }
  const url = `${c.openaiEndpoint.replace(/\/+$/, "")}/openai/deployments/${encodeURIComponent(
    c.openaiDeployment,
  )}/chat/completions?api-version=2024-08-01-preview`;
  const sys =
    language === "ar"
      ? "أنت محلل مؤسسي. حوّل المحتوى التالي إلى تقرير منظم بالعربية: ملخص تنفيذي، النقاط الرئيسية، البيانات والأرقام، المخاطر، التوصيات."
      : "You are an enterprise analyst. Produce a structured report: executive summary, key points, data, risks, recommendations.";
  const res = await fetch(url, {
    method: "POST",
    headers: { "api-key": c.openaiKey, "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `${instructions}\n\n---\n${text.slice(0, 120_000)}` },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export const Route = createFileRoute("/api/gdrive/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body = {};
        try { body = (await request.json()) as Body; } catch { return jsonErr(400, "JSON غير صالح"); }
        const ids = (body.fileIds ?? []).filter(Boolean);
        if (ids.length === 0) return jsonErr(400, "اختر ملفًا واحدًا على الأقل");
        const instructions = body.instructions?.trim() || "حلّل الملفات وأنشئ تقريرًا تنفيذيًا واضحًا.";
        const language = body.language ?? "ar";

        const sources: Array<{ id: string; name: string; mimeType: string; chars: number; error?: string }> = [];
        const chunks: string[] = [];
        for (const id of ids) {
          try {
            const meta = await getFileMeta(id);
            const text = await extractText(meta);
            sources.push({ id, name: meta.name, mimeType: meta.mimeType, chars: text.length });
            chunks.push(`# ${meta.name}\n${text}`);
          } catch (e) {
            sources.push({ id, name: id, mimeType: "?", chars: 0, error: (e as Error).message });
          }
        }

        const combined = chunks.join("\n\n---\n\n");
        if (currentMode() !== "live") {
          return jsonOk({
            mode: "not_configured",
            sources,
            report:
              "⚠️ Azure OpenAI غير مضبوط بعد. تم استخراج النصوص من Google Drive بنجاح، لكن توليد التقرير يحتاج ضبط الأسرار:\n\n" +
              "• AZURE_OPENAI_ENDPOINT\n• AZURE_OPENAI_API_KEY\n• AZURE_OPENAI_DEPLOYMENT\n\n" +
              `--- معاينة المحتوى المستخرج ---\n${combined.slice(0, 4000)}`,
          });
        }
        try {
          const report = await summarize(combined, instructions, language);
          return jsonOk({ mode: "live", sources, report });
        } catch (e) {
          return jsonErr(502, (e as Error).message, { sources });
        }
      },
    },
  },
});
