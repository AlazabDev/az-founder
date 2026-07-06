import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { currentMode, jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/analyze")({
  server: {
    middleware: [requireApiAuth],
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try { body = await request.json(); } catch { /* tolerate empty */ }
        return jsonOk({
          mode: currentMode(),
          accepted: true,
          payload: body,
          message:
            currentMode() === "live"
              ? "تم بدء التحليل"
              : "طلب التحليل مُسجَّل. يحتاج ضبط Azure Document Intelligence + OpenAI لتشغيل المعالجة.",
        });
      },
    },
  },
});
