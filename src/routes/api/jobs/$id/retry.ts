import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/jobs/$id/retry")({
  server: { handlers: { POST: async ({ params }) => jsonOk({ ok: true, id: params.id }) } },
});
