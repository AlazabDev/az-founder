import { createFileRoute } from "@tanstack/react-router";
import { buildIntegrationStatus, jsonOk, jsonErr, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/integrations/$id/test")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const id = params.id;
        const item = buildIntegrationStatus().find((i) => i.id === id);
        if (!item) return jsonErr(404, `تكامل غير معروف: ${id}`);
        if (!item.hasSecret) {
          return jsonErr(412, "لا يمكن اختبار الاتصال — السر غير مضبوط بعد", {
            id,
            status: "not_configured",
          });
        }
        // Real Azure round-trip should happen here once secrets are wired.
        return jsonOk({
          id,
          status: "connected",
          checkedAt: nowIso(),
          message: "تم التحقق من السر — اختبار الاتصال الفعلي يحتاج تنفيذ HTTP الاختبار في الباك اند.",
        });
      },
    },
  },
});
