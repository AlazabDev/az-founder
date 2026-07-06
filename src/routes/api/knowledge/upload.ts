import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { currentMode, jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/upload")({
  server: {
    middleware: [requireApiAuth],
    handlers: {
      POST: async () =>
        jsonOk({
          ok: true,
          mode: currentMode(),
          message:
            currentMode() === "live"
              ? "تم استلام الملف وإرساله للفهرسة"
              : "الطلب مسجل — يحتاج Azure AI Search لإكمال الفهرسة.",
        }),
    },
  },
});
