import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";

// Frontend expects a raw array.
export const Route = createFileRoute("/api/data/jobs")({
  server: {
    middleware: [requireApiAuth], handlers: { GET: async () => jsonOk([]) } },
});
