import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/tools/$id/test")({
  server: {
    middleware: [requireApiAuth],
    handlers: {
      POST: async ({ params }) =>
        jsonOk({ id: params.id, status: "ok", checkedAt: nowIso() }),
    },
  },
});
