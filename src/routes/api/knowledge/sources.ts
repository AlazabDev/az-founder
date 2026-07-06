import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/sources")({
  server: {
    middleware: [requireApiAuth], handlers: { GET: async () => jsonOk([]) } },
});
