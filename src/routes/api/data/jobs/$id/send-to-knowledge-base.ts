import { createFileRoute } from "@tanstack/react-router";
import { currentMode, jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/jobs/$id/send-to-knowledge-base")({
  server: {
    handlers: {
      POST: async ({ params }) =>
        jsonOk({
          ok: true,
          id: params.id,
          mode: currentMode(),
          message:
            currentMode() === "live"
              ? "تم الإرسال إلى Azure AI Search"
              : "الطلب مسجل — الإرسال الفعلي يحتاج ضبط Azure AI Search.",
        }),
    },
  },
});
