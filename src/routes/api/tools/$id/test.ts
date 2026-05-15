import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/tools/$id/test")({
  server: {
    handlers: {
      POST: async ({ params }) =>
        jsonOk({ id: params.id, status: "ok", checkedAt: nowIso() }),
    },
  },
});
