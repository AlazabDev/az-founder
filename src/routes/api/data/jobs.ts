import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

// Frontend expects a raw array.
export const Route = createFileRoute("/api/data/jobs")({
  server: { handlers: { GET: async () => jsonOk([]) } },
});
