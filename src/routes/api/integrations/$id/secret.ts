import { createFileRoute } from "@tanstack/react-router";
import { requireApiAdmin } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/integrations/$id/secret")({
  server: {
    middleware: [requireApiAdmin],
    handlers: {
      DELETE: async ({ params }) =>
        jsonOk({
          ok: true,
          id: params.id,
          message:
            "طلب حذف السر مُسجَّل. لتنفيذ الحذف الفعلي اربط Lovable Cloud Secrets أو Azure Key Vault بالباك اند.",
        }),
    },
  },
});
