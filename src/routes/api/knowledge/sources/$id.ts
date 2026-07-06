import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/sources/$id")({
  server: {
    middleware: [requireApiAuth], handlers: { DELETE: async ({ params }) => jsonOk({ ok: true, id: params.id }) } },
});
