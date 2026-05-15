import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/sources")({
  server: { handlers: { GET: async () => jsonOk([]) } },
});
