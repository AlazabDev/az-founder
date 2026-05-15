import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/sources/$id")({
  server: { handlers: { DELETE: async ({ params }) => jsonOk({ ok: true, id: params.id }) } },
});
