import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/jobs/$id/retry")({
  server: {
    middleware: [requireApiAuth], handlers: { POST: async ({ params }) => jsonOk({ ok: true, id: params.id }) } },
});
